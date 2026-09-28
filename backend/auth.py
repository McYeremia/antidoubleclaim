# Modul autentikasi & otorisasi backend.
# Backend tidak dipanggil langsung oleh browser: semua request datang dari server Next.js (BFF),
# yang sudah memeriksa login lalu meneruskan identitas lewat header. Header identitas hanya
# dipercaya jika request membawa X-Internal-Key yang benar (rahasia bersama backend & Next.js).
import os
import hmac
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request

from backend.database import get_operator_by_token, mahasiswa_boleh_lihat_klaim
from backend.nim_parser import is_valid_student_email

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")
if len(INTERNAL_API_KEY) < 32:
    # Gagal cepat saat startup: tanpa kunci ini backend tidak bisa membedakan request sah dari luar
    raise RuntimeError("INTERNAL_API_KEY belum diisi (minimal 32 karakter) di file .env. "
                       "Nilainya harus sama dengan INTERNAL_API_KEY di frontend/.env.local.")

PATH_PUBLIK = {"/"}  # hanya healthcheck yang boleh dipanggil tanpa kunci internal

# Penanda di respons 401 karena belum login / sesi berakhir, agar frontend bisa membedakannya dari
# 401 lain (mis. "password lama tidak sesuai") lalu mengarahkan pengguna ke halaman login.
HEADER_SESI_BERAKHIR = {"X-Sesi-Berakhir": "1"}


def wajib_kunci_internal(request: Request, x_internal_key: Optional[str] = Header(None)):
    # Dependency global: tolak semua request yang tidak datang dari server Next.js.
    if request.url.path in PATH_PUBLIK:
        return
    if not x_internal_key or not hmac.compare_digest(x_internal_key, INTERNAL_API_KEY):
        raise HTTPException(status_code=401, detail="Akses ditolak")


def identitas(
    x_mahasiswa_email: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
) -> Optional[dict]:
    # Menentukan siapa yang sedang login:
    #   operator  → token sesi di header Authorization: Bearer <token> (diverifikasi ke tabel OPERATOR_SESI)
    #   mahasiswa → email dari session Google yang sudah diverifikasi Next.js
    # Mengembalikan None jika tidak ada yang login.
    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):].strip()
        op = get_operator_by_token(token)
        if not op:
            raise HTTPException(status_code=401, detail="Sesi operator tidak valid atau sudah berakhir. Silakan login ulang.",
                                headers=HEADER_SESI_BERAKHIR)
        return {"tipe": "operator", "op": op, "token": token}
    if x_mahasiswa_email and is_valid_student_email(x_mahasiswa_email):
        email = x_mahasiswa_email.strip().lower()
        return {"tipe": "mahasiswa", "email": email, "nim": email.split("@")[0]}
    return None


def _wajib(ident: Optional[dict], *tipe: str) -> dict:
    if not ident:
        raise HTTPException(status_code=401, detail="Silakan login terlebih dahulu", headers=HEADER_SESI_BERAKHIR)
    if ident["tipe"] not in tipe:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    return ident


def pastikan_boleh_lihat_klaim(ident: dict, claim_id: int):
    # Operator boleh melihat semua klaim; mahasiswa hanya klaim miliknya atau klaim di mana ia anggota kelompok.
    if ident["tipe"] == "operator":
        return
    if not mahasiswa_boleh_lihat_klaim(claim_id, ident["email"]):
        raise HTTPException(status_code=403, detail="Akses ditolak")


# ── Dependency per role (dipakai di tiap endpoint lewat Depends) ─────────────
def wajib_login(ident: Optional[dict] = Depends(identitas)) -> dict:
    # Mahasiswa atau operator yang sudah login.
    return _wajib(ident, "mahasiswa", "operator")


def wajib_mahasiswa(ident: Optional[dict] = Depends(identitas)) -> dict:
    return _wajib(ident, "mahasiswa")


def wajib_operator(ident: Optional[dict] = Depends(identitas)) -> dict:
    # Operator maupun superadmin.
    return _wajib(ident, "operator")


def wajib_superadmin(ident: Optional[dict] = Depends(identitas)) -> dict:
    _wajib(ident, "operator")
    if ident["op"].get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Akses ditolak: hanya Super Admin yang dapat melakukan ini")
    return ident
