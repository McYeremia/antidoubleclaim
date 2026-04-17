from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import shutil
import os
import json
import traceback

from backend.database import (
    insert_claim, create_database,
    get_all_claims, get_claims_by_email, get_claim_by_id,
    approve_claim, discard_claim,
    insert_pengajuan, get_pengajuan_by_email, get_pengajuan_by_claim_id,
    update_pengajuan,
    insert_reward_konfirmasi, get_reward_konfirmasi_by_claim_id,
    get_reward_konfirmasi_by_email, update_reward_status, update_reward_konfirmasi,
    authenticate_operator, get_all_operators, get_operator_by_id,
    create_operator, delete_operator,
    get_stats_visualisasi,
    get_profil_mahasiswa, upsert_profil_mahasiswa,
    get_periode_aktif, get_periode_terkini, get_all_periode, create_periode,
    update_periode_status, update_periode_data, delete_periode, reset_semua_data,
    arsipkan_periode, get_claims_by_periode_id, get_rewards_by_periode_id,
)
from backend.nim_parser import parse_nim

app = FastAPI()

create_database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.mount("/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")

# ── Root ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "Backend Anti-Double Claim Aktif"}

# ── Statistik Visualisasi ────────────────────────────────────────────────────
@app.get("/stats/visualisasi")
async def stats_visualisasi():
    return get_stats_visualisasi()

# ── Profil Mahasiswa ──────────────────────────────────────────────────────────
class ProfilUpdate(BaseModel):
    nomor_wa:              Optional[str] = None
    nama_pemilik_rekening: Optional[str] = None
    nomor_rekening:        Optional[str] = None

@app.get("/profil")
async def get_profil(email: str):
    return get_profil_mahasiswa(email)

@app.put("/profil")
async def update_profil(email: str, body: ProfilUpdate):
    upsert_profil_mahasiswa(email, body.model_dump())
    return {"success": True}

# ── Periode Klaim ─────────────────────────────────────────────────────────────
class PeriodeCreate(BaseModel):
    nama:            str
    tanggal_mulai:   str
    tanggal_selesai: str
    dibuat_oleh:     Optional[str] = None
    semester:        Optional[int] = 0
    tahun:           Optional[int] = 0

@app.get("/periode/aktif")
async def periode_aktif():
    result = get_periode_aktif()
    if not result:
        return {"aktif": False, "periode": None}
    return {"aktif": True, "periode": result}

@app.get("/periode/terkini")
async def periode_terkini():
    """Periode yang mencakup hari ini berdasarkan tanggal (tidak peduli status aktif/tutup)."""
    result = get_periode_terkini()
    if not result:
        return {"ditemukan": False, "periode": None}
    aktif_sekarang = result.get("status") == "aktif"
    return {"ditemukan": True, "aktif": aktif_sekarang, "periode": result}

@app.get("/periode")
async def list_periode():
    return get_all_periode()

@app.post("/periode")
async def buat_periode(body: PeriodeCreate):
    periode_id = create_periode(body.model_dump())
    return {"success": True, "id": periode_id}

@app.put("/periode/{periode_id}")
async def ubah_status_periode(periode_id: int, status: str):
    ok = update_periode_status(periode_id, status)
    if not ok:
        raise HTTPException(status_code=400, detail="Status tidak valid. Gunakan 'aktif', 'tutup', atau 'ditutup'.")
    return {"success": True}

@app.post("/periode/{periode_id}/arsip")
async def arsip_periode(periode_id: int, x_operator_id: Optional[str] = Header(None)):
    _require_superadmin(x_operator_id)
    result = arsipkan_periode(periode_id)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail=result.get("alasan", "Tidak dapat mengarsipkan"))
    return {"success": True}

@app.get("/periode/{periode_id}/claims")
async def claims_by_periode(periode_id: int):
    return get_claims_by_periode_id(periode_id)

@app.get("/periode/{periode_id}/rewards")
async def rewards_by_periode(periode_id: int):
    return get_rewards_by_periode_id(periode_id)

class PeriodeEdit(BaseModel):
    nama:            str
    tanggal_mulai:   str
    tanggal_selesai: str

@app.patch("/periode/{periode_id}")
async def edit_periode(periode_id: int, body: PeriodeEdit):
    update_periode_data(periode_id, body.model_dump())
    return {"success": True}

@app.delete("/periode/{periode_id}")
async def hapus_periode(periode_id: int, x_operator_id: Optional[str] = Header(None)):
    _require_superadmin(x_operator_id)
    ok = delete_periode(periode_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus: periode tidak ditemukan atau sedang aktif.")
    return {"success": True}

@app.post("/admin/reset-data")
async def reset_data(x_operator_id: Optional[str] = Header(None)):
    _require_superadmin(x_operator_id)
    reset_semua_data()
    return {"success": True, "pesan": "Semua data berhasil dihapus. Tabel USERS tetap utuh."}

# ── NIM Info ─────────────────────────────────────────────────────────────────
@app.get("/nim-info")
async def nim_info(email: str):
    return parse_nim(email)

# ── Claims ──────────────────────────────────────────────────────────────────
@app.get("/claims")
async def list_claims(email: str = None):
    if email:
        return get_claims_by_email(email)
    return get_all_claims()

@app.get("/claims/{claim_id}")
async def detail_claim(claim_id: int):
    claim = get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Klaim tidak ditemukan")
    return claim

@app.patch("/claims/{claim_id}/approve")
async def approve(claim_id: int, x_operator_id: Optional[str] = Header(None)):
    claim = get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Klaim tidak ditemukan")
    op_id = int(x_operator_id) if x_operator_id and x_operator_id.isdigit() else None
    approve_claim(claim_id, operator_id=op_id)
    return {"message": "Klaim disetujui", "id": claim_id}

@app.delete("/claims/{claim_id}")
async def discard(claim_id: int):
    claim = get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Klaim tidak ditemukan")
    discard_claim(claim_id)
    return {"message": "Klaim dihapus", "id": claim_id}

# ── Upload ───────────────────────────────────────────────────────────────────
@app.post("/upload")
async def upload_certificate(
    nama_lomba: str = Form(...),
    tingkat: str = Form(...),
    tanggal: str = Form(...),
    peringkat: str = Form(...),
    mahasiswa_email: str = Form(...),
    nama_display: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        print(f"--- Menerima upload: {nama_lomba} dari {mahasiswa_email} ---")

        file_location = os.path.join(UPLOAD_FOLDER, file.filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"File disimpan di: {file_location}")

        result = insert_claim(nama_lomba, tingkat, tanggal, peringkat, file_location,
                              mahasiswa_email=mahasiswa_email, nama_display=nama_display)

        return {
            "uploaded":           result.get("uploaded", True),
            "flagged":            result.get("flagged", False),
            "id":                 result.get("id"),
            "duplikat_dengan_id": result.get("duplikat_dengan_id"),
            "similarity_nama":    result.get("similarity_nama"),
            "distance_phash":     result.get("distance_phash"),
            "flag_alasan":        result.get("flag_alasan"),
            "pesan":              result.get("pesan"),
        }

    except Exception as e:
        print("!!! ERROR SAAT UPLOAD !!!")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# ── Pengajuan ─────────────────────────────────────────────────────────────────
@app.post("/pengajuan")
async def submit_pengajuan(
    mahasiswa_email:     str            = Form(...),
    nama_display:        str            = Form(...),
    nomor_wa:            str            = Form(...),
    ada_dospem:          str            = Form(...),
    nidn_dospem:         Optional[str]  = Form(None),
    kategori_simkatmawa: str            = Form(...),
    jenis_kepesertaan:   str            = Form(...),
    nama_kegiatan:       str            = Form(...),
    kategori_kegiatan:   Optional[str]  = Form(None),
    tingkatan:           Optional[str]  = Form(None),
    tahun_kegiatan:      Optional[str]  = Form(None),
    model_pelaksanaan:   Optional[str]  = Form(None),
    jumlah_peserta:      Optional[str]  = Form(None),
    capaian:             Optional[str]  = Form(None),
    tanggal_mulai:       Optional[str]  = Form(None),
    tanggal_selesai:     Optional[str]  = Form(None),
    url_penyelenggara:   Optional[str]  = Form(None),
    keterangan:          Optional[str]  = Form(None),
    nama_lembaga:        Optional[str]  = Form(None),
    jenis_karya_teks:    Optional[str]  = Form(None),
    jenis_karya_pilihan: Optional[str]  = Form(None),
    deskripsi_karya:     Optional[str]  = Form(None),
    manfaat_karya:       Optional[str]  = Form(None),
    nomor_surat:         Optional[str]  = Form(None),
    tanggal_surat:       Optional[str]  = Form(None),
    nama_ketua:          Optional[str]  = Form(None),
    peran_pengeclaim:    Optional[str]  = Form(None),
    keterangan_kelompok:  Optional[str]  = Form(None),
    kompetisi_puspresnas: Optional[str]  = Form(None),
    anggota_json:         Optional[str]  = Form(None),
    setuju:               str            = Form("false"),
    claim_id:             Optional[str]  = Form(None),
    estimasi_reward:      Optional[str]  = Form(None),
    surat_tugas:         Optional[UploadFile] = File(None),
    foto_penyerahan:     Optional[UploadFile] = File(None),
    dokumen_sertifikat:  Optional[UploadFile] = File(None),
    dokumen_lainnya:     Optional[UploadFile] = File(None),
):
    try:
        def save_file(upload: Optional[UploadFile], prefix: str) -> Optional[str]:
            if not upload or not upload.filename:
                return None
            fname    = f"{prefix}_{upload.filename}"
            fpath    = os.path.join(UPLOAD_FOLDER, fname)
            with open(fpath, "wb") as buf:
                shutil.copyfileobj(upload.file, buf)
            return fpath

        surat_tugas_path       = save_file(surat_tugas,        "surat_tugas")
        foto_penyerahan_path   = save_file(foto_penyerahan,    "foto")
        dokumen_sertifikat_path = save_file(dokumen_sertifikat, "sertifikat")
        dokumen_lainnya_path   = save_file(dokumen_lainnya,    "lainnya")

        anggota = json.loads(anggota_json) if anggota_json else []

        data = {
            "mahasiswa_email":      mahasiswa_email,
            "nama_display":         nama_display,
            "nomor_wa":             nomor_wa,
            "ada_dospem":           ada_dospem,
            "nidn_dospem":          nidn_dospem,
            "surat_tugas_path":     surat_tugas_path,
            "kategori_simkatmawa":  kategori_simkatmawa,
            "jenis_kepesertaan":    jenis_kepesertaan,
            "nama_kegiatan":        nama_kegiatan,
            "kategori_kegiatan":    kategori_kegiatan,
            "tingkatan":            tingkatan,
            "tahun_kegiatan":       tahun_kegiatan,
            "model_pelaksanaan":    model_pelaksanaan,
            "jumlah_peserta":       int(jumlah_peserta) if jumlah_peserta else None,
            "capaian":              capaian,
            "tanggal_mulai":        tanggal_mulai,
            "tanggal_selesai":      tanggal_selesai,
            "url_penyelenggara":    url_penyelenggara,
            "keterangan":           keterangan,
            "dokumen_sertifikat_path": dokumen_sertifikat_path,
            "foto_penyerahan_path": foto_penyerahan_path,
            "dokumen_lainnya_path": dokumen_lainnya_path,
            "nama_lembaga":         nama_lembaga,
            "jenis_karya_teks":     jenis_karya_teks,
            "jenis_karya_pilihan":  jenis_karya_pilihan,
            "deskripsi_karya":      deskripsi_karya,
            "manfaat_karya":        manfaat_karya,
            "nomor_surat":          nomor_surat,
            "tanggal_surat":        tanggal_surat,
            "nama_ketua":           nama_ketua,
            "peran_pengeclaim":     peran_pengeclaim,
            "keterangan_kelompok":  keterangan_kelompok,
            "claim_id":             int(claim_id) if claim_id else None,
            "setuju":               setuju.lower() == "true",
            "estimasi_reward":      int(estimasi_reward) if estimasi_reward else None,
            "kompetisi_puspresnas": kompetisi_puspresnas,
        }

        pengajuan_id = insert_pengajuan(data, anggota)
        return {"success": True, "pengajuan_id": pengajuan_id}

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pengajuan")
async def list_pengajuan(email: str):
    return get_pengajuan_by_email(email)

@app.get("/pengajuan/by-claim/{claim_id}")
async def pengajuan_by_claim(claim_id: int):
    data = get_pengajuan_by_claim_id(claim_id)
    if not data:
        raise HTTPException(status_code=404, detail="Data pengajuan tidak ditemukan")
    return data

class PengajuanUpdate(BaseModel):
    nama_display:        Optional[str] = None
    nomor_wa:            Optional[str] = None
    ada_dospem:          Optional[str] = None
    nidn_dospem:         Optional[str] = None
    kategori_simkatmawa: Optional[str] = None
    jenis_kepesertaan:   Optional[str] = None
    nama_kegiatan:       Optional[str] = None
    kategori_kegiatan:   Optional[str] = None
    tingkatan:           Optional[str] = None
    tahun_kegiatan:      Optional[str] = None
    model_pelaksanaan:   Optional[str] = None
    jumlah_peserta:      Optional[int] = None
    capaian:             Optional[str] = None
    tanggal_mulai:       Optional[str] = None
    tanggal_selesai:     Optional[str] = None
    url_penyelenggara:   Optional[str] = None
    keterangan:          Optional[str] = None
    nama_lembaga:        Optional[str] = None
    jenis_karya_teks:    Optional[str] = None
    jenis_karya_pilihan: Optional[str] = None
    deskripsi_karya:     Optional[str] = None
    manfaat_karya:       Optional[str] = None
    nomor_surat:         Optional[str] = None
    tanggal_surat:       Optional[str] = None
    nama_ketua:          Optional[str] = None
    peran_pengeclaim:    Optional[str] = None
    keterangan_kelompok: Optional[str] = None
    estimasi_reward:     Optional[int] = None

@app.patch("/pengajuan/{pengajuan_id}")
async def edit_pengajuan(pengajuan_id: int, body: PengajuanUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="Tidak ada data yang diubah")
    update_pengajuan(pengajuan_id, data)
    return {"success": True}

# ── Reward Konfirmasi ──────────────────────────────────────────────────────────
@app.post("/reward-konfirmasi")
async def submit_reward_konfirmasi(
    claim_id:               str                    = Form(...),
    mahasiswa_email:        str                    = Form(...),
    tahun_klaim:            str                    = Form(...),
    periode:                str                    = Form(...),
    periode_id:             Optional[str]          = Form(None),
    nomor_urut_lampiran:    str                    = Form(...),
    kategori_lomba:         str                    = Form(...),
    kompetisi_puspresnas:   Optional[str]          = Form(None),
    judul_lomba:            Optional[str]          = Form(None),
    tahun_kegiatan:         Optional[str]          = Form(None),
    nama_ketua:             str                    = Form(...),
    nim:                    str                    = Form(...),
    nomor_wa:               str                    = Form(...),
    nama_pemilik_rekening:  str                    = Form(...),
    bank:                   str                    = Form("BNI"),
    nomor_rekening:         Optional[str]          = Form(None),
    bersedia:               str                    = Form("false"),
    data_benar:             str                    = Form("false"),
    foto_buku_tabungan:     Optional[UploadFile]   = File(None),
    foto_ktm:               Optional[UploadFile]   = File(None),
    foto_ktp:               Optional[UploadFile]   = File(None),
    pakta_integritas:       Optional[UploadFile]   = File(None),
    laporan_akhir:          Optional[UploadFile]   = File(None),
    karya_publikasi:        Optional[UploadFile]   = File(None),
):
    try:
        def save_file(upload: Optional[UploadFile], prefix: str) -> Optional[str]:
            if not upload or not upload.filename:
                return None
            fname = f"{prefix}_{upload.filename}"
            fpath = os.path.join(UPLOAD_FOLDER, fname)
            with open(fpath, "wb") as buf:
                shutil.copyfileobj(upload.file, buf)
            return fpath

        data = {
            "claim_id":               int(claim_id),
            "mahasiswa_email":        mahasiswa_email,
            "tahun_klaim":            tahun_klaim,
            "periode":                periode,
            "periode_id":             int(periode_id) if periode_id else None,
            "nomor_urut_lampiran":    nomor_urut_lampiran,
            "kategori_lomba":         kategori_lomba,
            "kompetisi_puspresnas":   kompetisi_puspresnas,
            "judul_lomba":            judul_lomba,
            "tahun_kegiatan":         tahun_kegiatan,
            "nama_ketua":             nama_ketua,
            "nim":                    nim,
            "nomor_wa":               nomor_wa,
            "nama_pemilik_rekening":  nama_pemilik_rekening,
            "bank":                   bank,
            "nomor_rekening":         nomor_rekening,
            "foto_buku_tabungan_path": save_file(foto_buku_tabungan, "reward_buku_tabungan"),
            "foto_ktm_path":           save_file(foto_ktm,           "reward_ktm"),
            "foto_ktp_path":           save_file(foto_ktp,           "reward_ktp"),
            "pakta_integritas_path":   save_file(pakta_integritas,   "reward_pakta"),
            "laporan_akhir_path":      save_file(laporan_akhir,      "reward_laporan"),
            "karya_publikasi_path":    save_file(karya_publikasi,    "reward_karya"),
            "bersedia":   bersedia.lower()   == "true",
            "data_benar": data_benar.lower() == "true",
        }

        reward_id = insert_reward_konfirmasi(data)
        return {"success": True, "reward_id": reward_id}

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


class RewardStatusUpdate(BaseModel):
    status: str
    catatan: Optional[str] = None

@app.get("/reward-konfirmasi")
async def list_rewards(email: Optional[str] = None):
    if email:
        return get_reward_konfirmasi_by_email(email)
    from backend.database import _get_conn
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT rk.*, c.nama_lomba, p.estimasi_reward
        FROM REWARD_KONFIRMASI rk
        LEFT JOIN CLAIMS c ON c.id = rk.claim_id
        LEFT JOIN PENGAJUAN p ON p.claim_id = rk.claim_id
        LEFT JOIN PERIODE_KLAIM pk ON pk.id = c.periode_id
        WHERE (pk.status IS NULL OR pk.status != 'diarsipkan')
        ORDER BY rk.id DESC
    """)
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    return [dict(zip(cols, row)) for row in rows]

@app.patch("/reward-konfirmasi/{reward_id}/status")
async def update_reward(reward_id: int, body: RewardStatusUpdate):
    update_reward_status(reward_id, body.status, body.catatan)
    return {"success": True}

@app.get("/reward-konfirmasi/{claim_id}")
async def get_reward(claim_id: int):
    data = get_reward_konfirmasi_by_claim_id(claim_id)
    if not data:
        raise HTTPException(status_code=404, detail="Data reward tidak ditemukan")
    return data

@app.put("/reward-konfirmasi/{reward_id}")
async def resubmit_reward(
    reward_id: int,
    tahun_klaim:           str            = Form(...),
    periode:               str            = Form(...),
    periode_id:            Optional[str]  = Form(None),
    nomor_urut_lampiran:   str            = Form(...),
    kategori_lomba:        str            = Form(...),
    kompetisi_puspresnas:  Optional[str]  = Form(None),
    judul_lomba:           Optional[str]  = Form(None),
    tahun_kegiatan:        str            = Form(...),
    nama_ketua:            str            = Form(...),
    nomor_wa:              str            = Form(...),
    nama_pemilik_rekening: str            = Form(...),
    bank:                  str            = Form("BNI"),
    nomor_rekening:        Optional[str]  = Form(None),
    bersedia:              str            = Form(...),
    data_benar:            str            = Form(...),
    foto_buku_tabungan:    Optional[UploadFile] = File(None),
    foto_ktm:              Optional[UploadFile] = File(None),
    foto_ktp:              Optional[UploadFile] = File(None),
    pakta_integritas:      Optional[UploadFile] = File(None),
    laporan_akhir:         Optional[UploadFile] = File(None),
    karya_publikasi:       Optional[UploadFile] = File(None),
):
    def save_file(upload: Optional[UploadFile]) -> Optional[str]:
        if not upload or not upload.filename:
            return None
        path = os.path.join(UPLOAD_FOLDER, upload.filename)
        with open(path, "wb") as f:
            shutil.copyfileobj(upload.file, f)
        return path

    data = {
        "tahun_klaim":            tahun_klaim,
        "periode":                periode,
        "periode_id":             int(periode_id) if periode_id else None,
        "nomor_urut_lampiran":    nomor_urut_lampiran,
        "kategori_lomba":         kategori_lomba,
        "kompetisi_puspresnas":   kompetisi_puspresnas,
        "judul_lomba":            judul_lomba,
        "tahun_kegiatan":         tahun_kegiatan,
        "nama_ketua":             nama_ketua,
        "nomor_wa":               nomor_wa,
        "nama_pemilik_rekening":  nama_pemilik_rekening,
        "bank":                   bank,
        "nomor_rekening":         nomor_rekening,
        "bersedia":               bersedia == "true",
        "data_benar":             data_benar == "true",
        "foto_buku_tabungan_path": save_file(foto_buku_tabungan),
        "foto_ktm_path":          save_file(foto_ktm),
        "foto_ktp_path":          save_file(foto_ktp),
        "pakta_integritas_path":  save_file(pakta_integritas),
        "laporan_akhir_path":     save_file(laporan_akhir),
        "karya_publikasi_path":   save_file(karya_publikasi),
    }
    update_reward_konfirmasi(reward_id, data)
    return {"success": True}


# ── Autentikasi & Manajemen Operator ─────────────────────────────────────────
class OperatorLoginRequest(BaseModel):
    username: str
    password: str

class CreateOperatorRequest(BaseModel):
    username: str
    password: str
    nama: str
    email: str
    role: Optional[str] = "operator"

def _require_superadmin(x_operator_id: Optional[str]):
    """Raise 403 jika requester bukan superadmin."""
    if not x_operator_id:
        raise HTTPException(status_code=403, detail="Akses ditolak: header X-Operator-ID diperlukan")
    try:
        op = get_operator_by_id(int(x_operator_id))
    except ValueError:
        op = None
    if not op or op.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Akses ditolak: hanya Super Admin yang dapat melakukan ini")

@app.post("/login-operator")
async def login_operator(body: OperatorLoginRequest):
    user = authenticate_operator(body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Username atau password salah")
    return {"success": True, "user": user}

@app.get("/operators")
async def list_operators(x_operator_id: Optional[str] = Header(None)):
    _require_superadmin(x_operator_id)
    return get_all_operators()

@app.post("/operators")
async def add_operator(
    body: CreateOperatorRequest,
    x_operator_id: Optional[str] = Header(None),
):
    _require_superadmin(x_operator_id)
    ok = create_operator(body.username, body.password, body.nama, body.email, body.role or "operator")
    if not ok:
        raise HTTPException(status_code=409, detail="Username atau email sudah digunakan")
    return {"success": True}

@app.delete("/operators/{operator_id}")
async def remove_operator(
    operator_id: int,
    x_operator_id: Optional[str] = Header(None),
):
    _require_superadmin(x_operator_id)
    if str(operator_id) == str(x_operator_id):
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus akun sendiri")
    ok = delete_operator(operator_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus: akun tidak ditemukan atau superadmin terakhir")
    return {"success": True}
