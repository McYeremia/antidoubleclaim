# Modul pengaman untuk endpoint yang bisa dipanggil tanpa login: batas ukuran request,
# rate limit per IP, batas proses berat bersamaan, dan cek sisa ruang disk.
# Semua batas bisa diubah lewat .env tanpa mengubah kode.
import os
import time
import shutil
import threading
from collections import deque
from typing import Optional

from fastapi import HTTPException, Request


def _env_int(name: str, default: int) -> int:
    # Membaca angka dari env; kembali ke default jika kosong atau bukan angka.
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


# Batas total satu request (semua file + isian form). Form reward berisi 6 file × 3 MB, jadi 25 MB cukup longgar.
MAX_REQUEST_BYTES = _env_int("MAX_REQUEST_MB", 25) * 1024 * 1024

# Rate limit endpoint upload per IP. Longgar karena banyak mahasiswa bisa berbagi satu IP publik (wifi kampus/NAT).
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
    # Sliding window di memori: menyimpan waktu request terakhir per IP.
    # Cukup untuk satu proses uvicorn; data hilang saat restart (tidak masalah untuk rate limit).
    # IP diambil dari request.client — jika di belakang reverse proxy/ngrok, jalankan uvicorn
    # dengan --proxy-headers agar IP asli dari X-Forwarded-For yang terbaca.
    MAX_TRACKED_IPS = 10_000  # batas jumlah IP yang dilacak, supaya limiter sendiri tidak menghabiskan memori

    def __init__(self, limit: int, window_sec: int):
        self.limit = limit
        self.window = window_sec
        self._hits: dict[str, deque] = {}
        self._lock = threading.Lock()

    def check(self, key: str) -> Optional[int]:
        # Catat satu request; kembalikan None jika diizinkan, atau detik tunggu jika melebihi batas.
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
        # Buang IP yang semua catatannya sudah di luar window.
        for key in [k for k, h in self._hits.items() if not h or now - h[-1] >= self.window]:
            del self._hits[key]

    def reset(self):
        with self._lock:
            self._hits.clear()


upload_limiter = RateLimiter(UPLOAD_RATE_LIMIT, UPLOAD_RATE_WINDOW)


def limit_upload(request: Request):
    # Dependency FastAPI untuk endpoint upload: tolak dengan 429 jika IP ini sudah melewati batas.
    ip = request.client.host if request.client else "unknown"
    retry_after = upload_limiter.check(ip)
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
