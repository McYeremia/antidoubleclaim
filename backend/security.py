# Modul pengaman untuk endpoint yang bisa dipanggil tanpa login: batas ukuran request,
# rate limit per IP, batas proses berat bersamaan, dan cek sisa ruang disk.
# Semua batas bisa diubah lewat .env tanpa mengubah kode.
import os
import time
import shutil
import threading
import re
from collections import deque
from typing import Optional

from fastapi import Depends, HTTPException, Request

from backend.auth import identitas


def _env_int(name: str, default: int) -> int:
    # Membaca angka dari env; kembali ke default jika kosong atau bukan angka.
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


# Batas total satu request (semua file + isian form). Form reward berisi 6 file × 3 MB, jadi 25 MB cukup longgar.
MAX_REQUEST_BYTES = _env_int("MAX_REQUEST_MB", 25) * 1024 * 1024

# Rate limit endpoint upload per akun (lihat limit_upload).
UPLOAD_RATE_LIMIT  = _env_int("UPLOAD_RATE_LIMIT", 30)        # jumlah request
UPLOAD_RATE_WINDOW = _env_int("UPLOAD_RATE_WINDOW_SEC", 600)  # dalam rentang detik

# Maksimal proses pHash/konversi PDF yang berjalan bersamaan, dan lama menunggu giliran sebelum ditolak.
MAX_CONCURRENT_HASH = _env_int("MAX_CONCURRENT_HASH", 2)
HASH_QUEUE_TIMEOUT  = _env_int("HASH_QUEUE_TIMEOUT_SEC", 20)

# Upload ditolak jika sisa ruang disk di bawah batas ini, supaya server tidak berhenti karena disk penuh.
MIN_FREE_DISK_BYTES = _env_int("MIN_FREE_DISK_MB", 500) * 1024 * 1024


# ── Batas ukuran request ──────────────────────────────────────────────────────
class _RequestTooLarge(Exception):
    pass


class BodySizeLimitMiddleware:
    # Middleware ASGI: menolak request yang body-nya melebihi MAX_REQUEST_BYTES dengan 413,
    # sebelum body di-parse. Header Content-Length dicek dulu; body tanpa Content-Length
    # (chunked) dihitung sambil dibaca dan dihentikan begitu melewati batas.
    def __init__(self, app, max_bytes: int = MAX_REQUEST_BYTES):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        for key, value in scope.get("headers", []):
            if key == b"content-length":
                try:
                    too_large = int(value) > self.max_bytes
                except ValueError:
                    too_large = True
                if too_large:
                    return await self._reject(send)

        received = 0
        response_started = False

        async def limited_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise _RequestTooLarge()
            return message

        async def tracking_send(message):
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, tracking_send)
        except _RequestTooLarge:
            if not response_started:
                await self._reject(send)

    async def _reject(self, send):
        body = f'{{"detail":"Ukuran request melebihi batas {self.max_bytes // (1024 * 1024)} MB"}}'.encode()
        await send({
            "type": "http.response.start",
            "status": 413,
            "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
        })
        await send({"type": "http.response.body", "body": body})


# ── Rate limit per IP ─────────────────────────────────────────────────────────
class RateLimiter:
    # Sliding window di memori: menyimpan waktu request terakhir per kunci (akun atau IP).
    # Cukup untuk satu proses uvicorn; data hilang saat restart (tidak masalah untuk rate limit).
    # Kunci ditentukan oleh pemanggil (lihat limit_upload).
    MAX_TRACKED_IPS = 10_000  # batas jumlah kunci yang dilacak, supaya limiter sendiri tidak menghabiskan memori

    def __init__(self, limit: int, window_sec: int):
        self.limit = limit
        self.window = window_sec
        self._hits: dict[str, deque] = {}
        self._lock = threading.Lock()

    def check(self, key: str) -> Optional[int]:
        # Catat satu request untuk kunci ini; kembalikan None jika diizinkan, atau detik tunggu jika melebihi batas.
        now = time.monotonic()
        with self._lock:
            if len(self._hits) > self.MAX_TRACKED_IPS:
                self._prune(now)
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return int(self.window - (now - hits[0])) + 1
            hits.append(now)
            return None

    def _prune(self, now: float):
        # Buang kunci yang semua catatannya sudah di luar window.
        for key in [k for k, h in self._hits.items() if not h or now - h[-1] >= self.window]:
            del self._hits[key]

    def reset(self):
        with self._lock:
            self._hits.clear()


upload_limiter = RateLimiter(UPLOAD_RATE_LIMIT, UPLOAD_RATE_WINDOW)


def limit_upload(request: Request, ident: Optional[dict] = Depends(identitas)):
    # Dependency FastAPI untuk endpoint upload: tolak dengan 429 jika akun ini sudah melewati batas.
    # Kuota dihitung per akun (email mahasiswa), karena semua request datang lewat server Next.js
    # sehingga IP-nya sama. IP hanya dipakai jika tidak ada yang login (request itu tetap akan ditolak 401).
    if ident and ident["tipe"] == "mahasiswa":
        kunci = "mhs:" + ident["email"]
    elif ident:
        kunci = f"op:{ident['op']['id']}"
    else:
        kunci = "ip:" + (request.client.host if request.client else "unknown")
    retry_after = upload_limiter.check(kunci)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Terlalu banyak pengiriman dari jaringan Anda. Coba lagi beberapa menit lagi.",
            headers={"Retry-After": str(retry_after)},
        )


# ── Proses berat & disk ───────────────────────────────────────────────────────
_hash_slots = threading.BoundedSemaphore(MAX_CONCURRENT_HASH)


class hash_slot:
    # Context manager: menunggu giliran untuk proses pHash/konversi PDF.
    # Jika antrean penuh sampai HASH_QUEUE_TIMEOUT, request ditolak 503 alih-alih membuat server macet.
    def __enter__(self):
        if not _hash_slots.acquire(timeout=HASH_QUEUE_TIMEOUT):
            raise HTTPException(status_code=503, detail="Server sedang sibuk memproses sertifikat lain. Coba lagi sebentar.")
        return self

    def __exit__(self, *exc):
        _hash_slots.release()
        return False


def ensure_disk_space(folder: str):
    # Tolak upload (507) jika sisa ruang disk di folder tujuan di bawah MIN_FREE_DISK_BYTES.
    if shutil.disk_usage(folder).free < MIN_FREE_DISK_BYTES:
        raise HTTPException(status_code=507, detail="Penyimpanan server hampir penuh. Hubungi operator.")


def read_limited(upload, max_bytes: int) -> bytes:
    # Membaca isi file upload maksimal max_bytes (+1 untuk mendeteksi kelebihan), tanpa memuat file raksasa ke memori.
    contents = upload.file.read(max_bytes + 1)
    if len(contents) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File '{upload.filename}' melebihi batas maksimal {max_bytes // (1024 * 1024)} MB")
    return contents


# ── Jenis file upload ─────────────────────────────────────────────────────────
# Semua file upload (sertifikat, dokumen pendukung, dokumen reward) hanya boleh PDF/JPG/PNG.
# Dicek dari ekstensi DAN isi awal file (magic bytes), supaya file lain yang diganti namanya tetap ditolak.
EKSTENSI_DIIZINKAN = {".pdf", ".jpg", ".jpeg", ".png"}


def _isi_sesuai_format(contents: bytes) -> bool:
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):  # PNG
        return True
    if contents.startswith(b"\xff\xd8\xff"):       # JPEG
        return True
    return b"%PDF-" in contents[:1024]             # PDF (spesifikasi mengizinkan header di 1 KB pertama)


def validasi_jenis_file(filename: str, contents: bytes):
    # Tolak (400) file yang ekstensinya bukan PDF/JPG/PNG atau isinya tidak sesuai format tersebut.
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in EKSTENSI_DIIZINKAN or not _isi_sesuai_format(contents):
        raise HTTPException(status_code=400, detail=f"File '{filename}' harus berformat PDF, JPG, atau PNG")


# ── Batas percobaan login & OTP ───────────────────────────────────────────────
LOGIN_MAKS_GAGAL      = _env_int("LOGIN_MAKS_GAGAL", 5)        # salah password berturut-turut per username
LOGIN_KUNCI_DETIK     = _env_int("LOGIN_KUNCI_DETIK", 900)     # lama akun dikunci setelah itu (15 menit)
OTP_MAKS_GAGAL        = _env_int("OTP_MAKS_GAGAL", 5)          # salah OTP sebelum kode hangus
OTP_MAKS_PERMINTAAN   = _env_int("OTP_MAKS_PERMINTAAN", 3)     # permintaan OTP per email…
OTP_PERMINTAAN_DETIK  = _env_int("OTP_PERMINTAAN_DETIK", 900)  # …dalam rentang ini (15 menit)


class PenghitungGagal:
    # Menghitung percobaan gagal per kunci (username/email) dalam jendela waktu tertentu.
    # Disimpan di memori (1 proses uvicorn), reset saat restart.
    def __init__(self, batas: int, jendela_detik: int):
        self.batas = batas
        self.jendela = jendela_detik
        self._data: dict[str, list] = {}  # kunci -> [jumlah gagal, waktu gagal pertama]
        self._lock = threading.Lock()

    def sisa_kunci(self, kunci: str) -> Optional[int]:
        # Detik tersisa jika kunci sedang terkunci (batas gagal tercapai), atau None jika boleh mencoba.
        now = time.monotonic()
        with self._lock:
            d = self._data.get(kunci)
            if not d:
                return None
            if now - d[1] >= self.jendela:
                del self._data[kunci]
                return None
            return int(self.jendela - (now - d[1])) + 1 if d[0] >= self.batas else None

    def catat_gagal(self, kunci: str) -> int:
        # Tambah satu percobaan gagal; kembalikan jumlah gagal saat ini.
        now = time.monotonic()
        with self._lock:
            if len(self._data) > RateLimiter.MAX_TRACKED_IPS:
                for k in [k for k, v in self._data.items() if now - v[1] >= self.jendela]:
                    del self._data[k]
            d = self._data.get(kunci)
            if not d or now - d[1] >= self.jendela:
                d = self._data[kunci] = [0, now]
            d[0] += 1
            return d[0]

    def reset(self, kunci: str = None):
        with self._lock:
            if kunci is None:
                self._data.clear()
            else:
                self._data.pop(kunci, None)


login_gagal       = PenghitungGagal(LOGIN_MAKS_GAGAL, LOGIN_KUNCI_DETIK)
otp_gagal         = PenghitungGagal(OTP_MAKS_GAGAL, OTP_PERMINTAAN_DETIK)
otp_permintaan    = RateLimiter(OTP_MAKS_PERMINTAAN, OTP_PERMINTAAN_DETIK)


def tolak_terlalu_banyak(detik: int, pesan: str):
    raise HTTPException(status_code=429, detail=pesan, headers={"Retry-After": str(detik)})


# ── Nama file upload ──────────────────────────────────────────────────────────
_KARAKTER_TERLARANG = re.compile(r'[\x00-\x1f<>:"|?*]')  # karakter yang tidak sah di nama file Windows
PANJANG_NAMA_MAKS   = 150


def bersihkan_nama_file(nama: str) -> str:
    # Membersihkan nama file dari pengguna sebelum dipakai sebagai bagian nama file di disk.
    # Mencegah path traversal: "..\..\backend\api.py" menjadi "backend_api.py", sehingga file
    # selalu tersimpan di folder uploads. Nama file normal (mis. "sertifikat lomba.pdf") tidak berubah.
    bagian = [b for b in (nama or "").replace("\\", "/").split("/") if b not in ("", ".", "..")]
    hasil = "_".join(bagian)
    hasil = _KARAKTER_TERLARANG.sub("_", hasil)
    hasil = re.sub(r"\.{2,}", ".", hasil)   # tidak boleh ada ".." tersisa
    hasil = hasil.strip(" .")                # Windows membuang titik/spasi di ujung nama
    if len(hasil) > PANJANG_NAMA_MAKS:       # potong nama yang terlalu panjang, pertahankan ekstensi
        dasar, ext = os.path.splitext(hasil)
        hasil = dasar[:PANJANG_NAMA_MAKS - len(ext)] + ext
    return hasil or "file"
