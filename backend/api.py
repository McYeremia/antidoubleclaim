# Modul utama FastAPI: mendefinisikan semua endpoint REST untuk klaim, pengajuan, reward, operator, periode, dan simulator.
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import shutil
import os
import json
import traceback
import uuid
import secrets

from backend.database import (
    insert_claim, create_database,
    get_all_claims, get_claims_by_email, get_claim_by_id,
    approve_claim, reject_claim, get_ditolak_claims,
    insert_pengajuan, get_pengajuan_by_email, get_pengajuan_by_claim_id,
    get_pengajuan_by_id, update_pengajuan,
    insert_reward_konfirmasi, get_reward_konfirmasi_by_claim_id,
    get_reward_konfirmasi_by_email, update_reward_status, update_reward_konfirmasi,
    authenticate_operator, get_all_operators, get_operator_by_id,
    create_operator, delete_operator,
    get_stats_visualisasi, get_export_data,
    get_profil_mahasiswa, upsert_profil_mahasiswa,
    insert_audit_log, get_audit_log,
    get_periode_aktif, get_periode_terkini, get_all_periode, create_periode,
    update_periode_status, update_periode_data, delete_periode, reset_semua_data,
    arsipkan_periode, get_claims_by_periode_id, get_rewards_by_periode_id, get_periode_nama,
    get_all_reward_konfirmasi,
    get_reward_konfirmasi_by_id,
    get_klaim_sebagai_anggota,
    update_operator_password,
    get_operator_by_email,
    create_operator_otp,
    verify_operator_otp,
    buat_sesi_operator, hapus_sesi_operator, hapus_semua_sesi_operator,
    mahasiswa_boleh_lihat_file,
)
from backend.nim_parser import parse_nim, is_valid_student_email
from backend.auth import (
    wajib_kunci_internal, wajib_login, wajib_mahasiswa, wajib_operator, wajib_superadmin,
    pastikan_boleh_lihat_klaim,
)
from backend.image_hash import SertifikatTidakValid
from backend.security import (
    BodySizeLimitMiddleware, limit_upload, hash_slot, ensure_disk_space, read_limited,
    validasi_jenis_file, login_gagal, otp_gagal, otp_permintaan, tolak_terlalu_banyak,
    bersihkan_nama_file,
)
from backend.email_service import (
    kirim_email_klaim_disetujui,
    kirim_email_klaim_tidak_lolos,
    kirim_email_reward_diproses,
    kirim_email_reward_dikembalikan,
    kirim_email_reward_selesai,
    kirim_email_otp_reset_operator,
)

# Semua endpoint wajib membawa X-Internal-Key (hanya diketahui server Next.js), kecuali GET /.
# Dokumentasi otomatis (/docs, /openapi.json) dimatikan agar daftar endpoint tidak terbuka.
# CORS tidak dipasang: browser tidak lagi memanggil backend secara langsung.
app = FastAPI(
    dependencies=[Depends(wajib_kunci_internal)],
    docs_url=None, redoc_url=None, openapi_url=None,
)

create_database()

# Tolak request yang terlalu besar sebelum body di-parse (batas: MAX_REQUEST_MB di .env)
app.add_middleware(BodySizeLimitMiddleware)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
MAX_FILE_SIZE = 3 * 1024 * 1024  # Batas ukuran file upload: maks 3 MB per file

MAX_ANGGOTA = 50  # sama dengan batas di wizard frontend

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def _hapus_file(paths):
    # Menghapus file yang sudah terlanjur ditulis jika proses penyimpanan gagal, supaya tidak menumpuk di disk.
    for p in paths:
        if p and os.path.exists(p):
            try:
                os.remove(p)
            except OSError:
                pass

# ── File Upload (menggantikan folder /uploads yang dulu terbuka publik) ─────────
# Tipe konten ditentukan dari daftar ini, bukan dari isi file, agar file seperti .html/.svg tidak dijalankan browser
_CONTENT_TYPE = {".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}

@app.get("/files/{nama_file}")
def ambil_file(nama_file: str, ident: dict = Depends(wajib_login)):
    # Mengirim file upload hanya ke operator, atau ke mahasiswa pemilik/anggota kelompok klaim yang memakai file itu.
    if not nama_file or ".." in nama_file or "/" in nama_file or "\\" in nama_file:
        raise HTTPException(status_code=400, detail="Nama file tidak valid")
    path = os.path.join(UPLOAD_FOLDER, nama_file)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    if ident["tipe"] == "mahasiswa" and not mahasiswa_boleh_lihat_file(nama_file, ident["email"]):
        raise HTTPException(status_code=403, detail="Akses ditolak")
    ext = os.path.splitext(nama_file)[1].lower()
    media_type = _CONTENT_TYPE.get(ext, "application/octet-stream")
    return FileResponse(
        path,
        media_type=media_type,
        # Tipe selain PDF/gambar selalu diunduh, tidak dibuka di browser
        content_disposition_type="inline" if ext in _CONTENT_TYPE else "attachment",
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=3600"},
    )

# ── Root ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    # Endpoint root untuk verifikasi bahwa backend aktif.
    return {"message": "Backend Anti-Double Claim Aktif"}

# ── Statistik Visualisasi ────────────────────────────────────────────────────
@app.get("/stats/visualisasi", dependencies=[Depends(wajib_login)])
async def stats_visualisasi(
    fakultas:  Optional[str] = None,
    prodi:     Optional[str] = None,
    tahun:     Optional[str] = None,
    tingkatan: Optional[str] = None,
    kategori:  Optional[str] = None,
    periode:   Optional[str] = None,
):
    # Mengambil data statistik visualisasi dengan filter opsional (fakultas, prodi, tahun, tingkatan, kategori, periode).
    return get_stats_visualisasi(
        filter_fakultas=fakultas,
        filter_prodi=prodi,
        filter_tahun=tahun,
        filter_tingkatan=tingkatan,
        filter_kategori=kategori,
        filter_periode=periode,
    )

# ── Export Data ─────────────────────────────────────────────────────────────
@app.get("/stats/export", dependencies=[Depends(wajib_operator)])
async def export_data(
    fakultas:    Optional[str] = None,
    prodi:       Optional[str] = None,
    tahun:       Optional[str] = None,
    tingkatan:   Optional[str] = None,
    kategori:    Optional[str] = None,
    kepesertaan: Optional[str] = None,
):
    # Mengambil data mentah klaim untuk diekspor sebagai tabel (dengan filter opsional).
    return get_export_data(
        filter_fakultas=fakultas,
        filter_prodi=prodi,
        filter_tahun=tahun,
        filter_tingkatan=tingkatan,
        filter_kategori=kategori,
        filter_kepesertaan=kepesertaan,
    )

# ── Profil Mahasiswa ──────────────────────────────────────────────────────────
# Body JSON untuk PUT /profil — field yang bisa diperbarui oleh mahasiswa
class ProfilUpdate(BaseModel):
    nomor_wa:              Optional[str] = None
    nama_pemilik_rekening: Optional[str] = None
    nomor_rekening:        Optional[str] = None

@app.get("/profil")
async def get_profil(ident: dict = Depends(wajib_mahasiswa)):
    # Mengambil data profil tersimpan (nomor WA, rekening) milik mahasiswa yang sedang login.
    return get_profil_mahasiswa(ident["email"])

@app.put("/profil")
async def update_profil(body: ProfilUpdate, ident: dict = Depends(wajib_mahasiswa)):
    # Memperbarui atau membuat data profil mahasiswa yang sedang login (nomor WA, nama dan nomor rekening).
    upsert_profil_mahasiswa(ident["email"], body.model_dump())
    return {"success": True}

# ── Periode Klaim ─────────────────────────────────────────────────────────────
# Body JSON untuk POST /periode — nama di-generate otomatis dari nomor_periode + semester + tahun
class PeriodeCreate(BaseModel):
    nomor_periode:   int
    semester:        str            # "Gasal" atau "Genap"
    tahun:           int
    tanggal_mulai:   str
    tanggal_selesai: str
    dibuat_oleh:     Optional[str] = None

@app.get("/periode/aktif", dependencies=[Depends(wajib_login)])
async def periode_aktif():
    # Mengambil periode klaim yang statusnya 'aktif' dan waktunya mencakup hari ini.
    result = get_periode_aktif()
    if not result:
        return {"aktif": False, "periode": None}
    return {"aktif": True, "periode": result}

@app.get("/periode/terkini", dependencies=[Depends(wajib_login)])
async def periode_terkini():
    # Mengambil periode yang mencakup hari ini berdasarkan tanggal (tidak peduli status aktif/tutup).
    result = get_periode_terkini()
    if not result:
        return {"ditemukan": False, "periode": None}
    aktif_sekarang = result.get("status") == "aktif"
    return {"ditemukan": True, "aktif": aktif_sekarang, "periode": result}

@app.get("/periode", dependencies=[Depends(wajib_operator)])
async def list_periode():
    # Mengambil semua periode klaim yang ada di database.
    return get_all_periode()

@app.post("/periode")
async def buat_periode(body: PeriodeCreate, ident: dict = Depends(wajib_operator)):
    # Membuat periode klaim baru dan mencatat aksi ke audit log — hanya operator.
    op = ident["op"]
    periode_id = create_periode(body.model_dump())
    nama = f"Periode {body.nomor_periode} Semester {body.semester} {body.tahun}"
    insert_audit_log(op["id"], op["nama"], "buat_periode", "periode", periode_id, nama)
    return {"success": True, "id": periode_id}

@app.put("/periode/{periode_id}")
async def ubah_status_periode(periode_id: int, status: str, ident: dict = Depends(wajib_operator)):
    # Mengubah status periode (tutup/aktif/ditutup) dengan validasi transisi — hanya operator.
    op = ident["op"]
    result = update_periode_status(periode_id, status)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail=result.get("alasan", "Gagal mengubah status periode."))
    insert_audit_log(op["id"], op["nama"], f"periode_{status}", "periode", periode_id, get_periode_nama(periode_id))
    return {"success": True}

@app.post("/periode/{periode_id}/arsip")
async def arsip_periode(periode_id: int, ident: dict = Depends(wajib_superadmin)):
    # Mengarsipkan periode beserta semua klaim dan reward di dalamnya — hanya superadmin.
    op = ident["op"]
    result = arsipkan_periode(periode_id)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail=result.get("alasan", "Tidak dapat mengarsipkan"))
    insert_audit_log(op["id"], op["nama"], "arsip_periode", "periode", periode_id, get_periode_nama(periode_id))
    return {"success": True}

@app.get("/periode/{periode_id}/claims", dependencies=[Depends(wajib_operator)])
async def claims_by_periode(periode_id: int):
    # Mengambil semua klaim yang terhubung ke periode tertentu.
    return get_claims_by_periode_id(periode_id)

@app.get("/periode/{periode_id}/rewards", dependencies=[Depends(wajib_operator)])
async def rewards_by_periode(periode_id: int):
    # Mengambil semua data reward yang terhubung ke periode tertentu.
    return get_rewards_by_periode_id(periode_id)

# Body JSON untuk PATCH /periode/{id} — nama di-generate ulang dari nomor_periode + semester + tahun
class PeriodeEdit(BaseModel):
    nomor_periode:   int
    semester:        str            # "Gasal" atau "Genap"
    tahun:           int
    tanggal_mulai:   str
    tanggal_selesai: str

@app.patch("/periode/{periode_id}")
async def edit_periode(periode_id: int, body: PeriodeEdit, ident: dict = Depends(wajib_operator)):
    # Mengedit periode (nomor, semester, tahun, tanggal) dan me-regenerasi nama — hanya operator.
    op = ident["op"]
    update_periode_data(periode_id, body.model_dump())
    nama = f"Periode {body.nomor_periode} Semester {body.semester} {body.tahun}"
    insert_audit_log(op["id"], op["nama"], "edit_periode", "periode", periode_id, nama)
    return {"success": True}

@app.delete("/periode/{periode_id}")
async def hapus_periode(periode_id: int, ident: dict = Depends(wajib_superadmin)):
    # Menghapus periode yang tidak sedang aktif; gagal jika periode masih aktif — hanya superadmin.
    op = ident["op"]
    nama_periode = get_periode_nama(periode_id)
    ok = delete_periode(periode_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus: periode tidak ditemukan atau sedang aktif.")
    insert_audit_log(op["id"], op["nama"], "hapus_periode", "periode", periode_id, nama_periode)
    return {"success": True}

@app.post("/admin/reset-data")
async def reset_data(ident: dict = Depends(wajib_superadmin)):
    # Menghapus semua data (klaim, pengajuan, reward, periode) kecuali tabel USERS — hanya superadmin.
    op = ident["op"]
    reset_semua_data()
    insert_audit_log(op["id"], op["nama"], "reset_semua_data", None, None, None)
    return {"success": True, "pesan": "Semua data berhasil dihapus. Tabel USERS tetap utuh."}

# ── Audit Log ──────────────────────────────────────────────────────────────────────────
@app.get("/audit-log")
async def list_audit_log(
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
    ident: dict = Depends(wajib_superadmin),
):
    # Mengambil riwayat aktivitas operator dengan filter rentang tanggal — hanya superadmin.
    return get_audit_log(date_from=date_from, date_to=date_to)

# ── NIM Info ─────────────────────────────────────────────────────────────────
@app.get("/nim-info")
async def nim_info(ident: dict = Depends(wajib_mahasiswa)):
    # Parsing NIM dari email mahasiswa yang sedang login dan mengembalikan info fakultas, prodi, angkatan.
    return parse_nim(ident["email"])

# ── Claims ──────────────────────────────────────────────────────────────────
@app.get("/claims")
async def list_claims(email: str = None, ident: dict = Depends(wajib_login)):
    # Mahasiswa selalu mendapat klaim miliknya sendiri (parameter email diabaikan).
    # Operator: jika email diberikan, klaim milik mahasiswa tersebut; jika tidak, semua klaim.
    if ident["tipe"] == "mahasiswa":
        return get_claims_by_email(ident["email"])
    if email:
        return get_claims_by_email(email)
    return get_all_claims()

@app.get("/klaim-sebagai-anggota")
async def klaim_sebagai_anggota(ident: dict = Depends(wajib_mahasiswa)):
    # Mengambil klaim di mana mahasiswa yang sedang login terdaftar sebagai anggota kelompok (bukan ketua).
    return get_klaim_sebagai_anggota(ident["nim"])

@app.get("/claims/ditolak", dependencies=[Depends(wajib_operator)])
async def get_claims_ditolak():
    # Mengambil semua klaim berstatus ditolak untuk riwayat di panel operator.
    return get_ditolak_claims()

@app.get("/claims/{claim_id}")
async def detail_claim(claim_id: int, ident: dict = Depends(wajib_login)):
    # Mengambil detail satu klaim beserta info operator yang memverifikasi (pemilik, anggota kelompok, atau operator).
    claim = get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Klaim tidak ditemukan")
    pastikan_boleh_lihat_klaim(ident, claim_id)
    return claim

@app.patch("/claims/{claim_id}/approve")
async def approve(claim_id: int, background_tasks: BackgroundTasks, ident: dict = Depends(wajib_operator)):
    # Menyetujui klaim, mencatat audit log, dan mengirim email notifikasi ke mahasiswa.
    op = ident["op"]
    claim = get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Klaim tidak ditemukan")
    approve_claim(claim_id, operator_id=op["id"])
    insert_audit_log(op["id"], op["nama"], "approve_klaim", "klaim", claim_id, claim["nama_lomba"])
    background_tasks.add_task(kirim_email_klaim_disetujui, claim["mahasiswa_email"], claim["nama_lomba"])
    return {"message": "Klaim disetujui", "id": claim_id}

# Body JSON untuk DELETE /claims/{id} — catatan alasan penolakan (opsional)
class DiscardBody(BaseModel):
    catatan: Optional[str] = None

@app.delete("/claims/{claim_id}")
async def discard(claim_id: int, background_tasks: BackgroundTasks, body: Optional[DiscardBody] = None, ident: dict = Depends(wajib_operator)):
    # Menolak klaim dengan catatan alasan, mencatat audit log, dan mengirim email notifikasi ke mahasiswa.
    op = ident["op"]
    claim = get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Klaim tidak ditemukan")
    catatan = body.catatan if body else None
    reject_claim(claim_id, operator_id=op["id"], catatan=catatan)
    insert_audit_log(op["id"], op["nama"], "tolak_klaim", "klaim", claim_id, claim["nama_lomba"])
    background_tasks.add_task(kirim_email_klaim_tidak_lolos, claim["mahasiswa_email"], claim["nama_lomba"], catatan)
    return {"message": "Klaim ditolak", "id": claim_id}

# ── Upload ───────────────────────────────────────────────────────────────────
# Endpoint upload ditulis `def` (bukan `async def`) agar FastAPI menjalankannya di threadpool:
# konversi PDF + pHash yang lambat tidak lagi menahan request pengguna lain.
@app.post("/upload", dependencies=[Depends(limit_upload)])
def upload_certificate(
    nama_lomba: str = Form(...),
    tingkat: str = Form(...),
    tanggal: str = Form(...),
    peringkat: str = Form(...),
    nama_display: str = Form(...),
    file: UploadFile = File(...),
    kategori_simkatmawa: Optional[str] = Form(None),
    mahasiswa_email: Optional[str] = Form(None),  # tidak dipakai lagi: email diambil dari login
    ident: dict = Depends(wajib_mahasiswa),
):
    # Menerima upload sertifikat, menyimpan file ke disk, dan menjalankan deteksi duplikat.
    mahasiswa_email = ident["email"]
    file_location = None
    try:
        print(f"--- Menerima upload: {nama_lomba} dari {mahasiswa_email} ---")

        # Format dicek sebelum file ditulis, supaya file yang pasti ditolak tidak sempat memakan disk
        if os.path.splitext(file.filename or "")[1].lower() not in (".jpg", ".jpeg", ".png", ".pdf"):
            raise HTTPException(status_code=400, detail="Format sertifikat harus PDF, JPG, atau PNG")
        ensure_disk_space(UPLOAD_FOLDER)
        contents = read_limited(file, MAX_FILE_SIZE)
        validasi_jenis_file(file.filename, contents)

        # Nama file diberi prefix UUID agar unik meski mahasiswa mengirim file bernama sama
        unique_name   = f"{uuid.uuid4().hex}_{bersihkan_nama_file(file.filename)}"
        file_location = os.path.join(UPLOAD_FOLDER, unique_name)
        with open(file_location, "wb") as buffer:
            buffer.write(contents)
        print(f"File disimpan di: {file_location}")

        # Proses pHash dibatasi beberapa sekaligus (MAX_CONCURRENT_HASH) agar server tidak kehabisan CPU/RAM
        with hash_slot():
            result = insert_claim(nama_lomba, tingkat, tanggal, peringkat, file_location,
                                  mahasiswa_email=mahasiswa_email, nama_display=nama_display,
                                  kategori_simkatmawa=kategori_simkatmawa)

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

    except HTTPException:
        _hapus_file([file_location])
        raise
    except SertifikatTidakValid as e:
        # Dari generate_phash: format tidak didukung, PDF rusak, atau dimensi terlalu besar
        _hapus_file([file_location])
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        _hapus_file([file_location])
        print("!!! ERROR SAAT UPLOAD !!!")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# ── Pengajuan ─────────────────────────────────────────────────────────────────
@app.post("/pengajuan", dependencies=[Depends(limit_upload)])
def submit_pengajuan(
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
    mahasiswa_email:     Optional[str]  = Form(None),  # tidak dipakai lagi: email diambil dari login
    ident: dict = Depends(wajib_mahasiswa),
):
    # Menerima data pengajuan SIMKATMAWA lengkap beserta file-file dokumen pendukung.
    mahasiswa_email = ident["email"]
    # Pengajuan hanya boleh ditautkan ke klaim milik mahasiswa itu sendiri
    if claim_id:
        if not claim_id.isdigit():
            raise HTTPException(status_code=400, detail="claim_id tidak valid")
        klaim = get_claim_by_id(int(claim_id))
        if not klaim or (klaim.get("mahasiswa_email") or "").lower() != mahasiswa_email:
            raise HTTPException(status_code=403, detail="Akses ditolak")
    saved = []  # path file yang sudah ditulis, dihapus lagi jika proses gagal
    try:
        # Data anggota divalidasi dulu sebelum file apa pun ditulis ke disk
        try:
            anggota = json.loads(anggota_json) if anggota_json else []
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Data anggota tidak valid")
        if not isinstance(anggota, list) or not all(isinstance(a, dict) for a in anggota):
            raise HTTPException(status_code=400, detail="Data anggota tidak valid")
        if len(anggota) > MAX_ANGGOTA:
            raise HTTPException(status_code=400, detail=f"Jumlah anggota maksimal {MAX_ANGGOTA}")
        ensure_disk_space(UPLOAD_FOLDER)

        def save_file(upload: Optional[UploadFile], prefix: str) -> Optional[str]:
            # Menyimpan file upload ke folder uploads dengan nama unik; kembalikan path-nya.
            if not upload or not upload.filename:
                return None
            contents = read_limited(upload, MAX_FILE_SIZE)
            validasi_jenis_file(upload.filename, contents)  # hanya PDF/JPG/PNG
            fname    = f"{prefix}_{uuid.uuid4().hex}_{bersihkan_nama_file(upload.filename)}"
            fpath    = os.path.join(UPLOAD_FOLDER, fname)
            with open(fpath, "wb") as buf:
                buf.write(contents)
            saved.append(fpath)
            return fpath

        surat_tugas_path       = save_file(surat_tugas,        "surat_tugas")
        foto_penyerahan_path   = save_file(foto_penyerahan,    "foto")
        dokumen_sertifikat_path = save_file(dokumen_sertifikat, "sertifikat")
        dokumen_lainnya_path   = save_file(dokumen_lainnya,    "lainnya")

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

    except HTTPException:
        _hapus_file(saved)
        raise
    except Exception as e:
        _hapus_file(saved)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pengajuan")
async def list_pengajuan(ident: dict = Depends(wajib_mahasiswa)):
    # Mengambil semua pengajuan milik mahasiswa yang sedang login.
    return get_pengajuan_by_email(ident["email"])

@app.get("/pengajuan/by-claim/{claim_id}")
async def pengajuan_by_claim(claim_id: int, ident: dict = Depends(wajib_login)):
    # Mengambil data pengajuan yang terhubung ke klaim tertentu (pemilik, anggota kelompok, atau operator).
    pastikan_boleh_lihat_klaim(ident, claim_id)
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

EDITABLE_STATUSES = {"belum dicek", "perlu ditinjau"}  # Status klaim yang masih boleh diedit oleh mahasiswa

@app.patch("/pengajuan/{pengajuan_id}")
async def edit_pengajuan(pengajuan_id: int, body: PengajuanUpdate, ident: dict = Depends(wajib_login)):
    # Mengedit data pengajuan selama klaimnya belum diproses operator (belum dicek/perlu ditinjau).
    # Boleh dilakukan operator atau mahasiswa pemilik pengajuan (anggota kelompok hanya bisa melihat).
    pengajuan = get_pengajuan_by_id(pengajuan_id)
    if not pengajuan:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if ident["tipe"] == "mahasiswa" and (pengajuan.get("mahasiswa_email") or "").lower() != ident["email"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    claim = get_claim_by_id(pengajuan["claim_id"])
    if not claim or claim.get("status") not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=409,
            detail="Klaim ini sudah diproses operator, perubahan tidak dapat disimpan"
        )
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="Tidak ada data yang diubah")
    update_pengajuan(pengajuan_id, data)
    return {"success": True}

# ── Reward Konfirmasi ──────────────────────────────────────────────────────────
@app.post("/reward-konfirmasi", dependencies=[Depends(limit_upload)])
def submit_reward_konfirmasi(
    claim_id:               str                    = Form(...),
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
    mahasiswa_email:        Optional[str]          = Form(None),  # tidak dipakai lagi: email diambil dari login
    ident: dict = Depends(wajib_mahasiswa),
):
    # Menerima data konfirmasi reward dari mahasiswa beserta dokumen rekening dan laporan akhir.
    mahasiswa_email = ident["email"]
    # Reward hanya boleh dikonfirmasi oleh pemilik klaim
    klaim = get_claim_by_id(int(claim_id)) if claim_id.isdigit() else None
    if not klaim or (klaim.get("mahasiswa_email") or "").lower() != mahasiswa_email:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    saved = []  # path file yang sudah ditulis, dihapus lagi jika proses gagal
    try:
        ensure_disk_space(UPLOAD_FOLDER)

        def save_file(upload: Optional[UploadFile], prefix: str) -> Optional[str]:
            # Menyimpan file upload ke folder uploads dengan nama unik; kembalikan path-nya.
            if not upload or not upload.filename:
                return None
            contents = read_limited(upload, MAX_FILE_SIZE)
            validasi_jenis_file(upload.filename, contents)  # hanya PDF/JPG/PNG
            fname = f"{prefix}_{uuid.uuid4().hex}_{bersihkan_nama_file(upload.filename)}"
            fpath = os.path.join(UPLOAD_FOLDER, fname)
            with open(fpath, "wb") as buf:
                buf.write(contents)
            saved.append(fpath)
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

    except HTTPException:
        _hapus_file(saved)
        raise
    except Exception as e:
        _hapus_file(saved)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# Body JSON untuk PATCH /reward-konfirmasi/{id}/status — status baru dan catatan opsional dari operator
class RewardStatusUpdate(BaseModel):
    status: str
    catatan: Optional[str] = None

@app.get("/reward-konfirmasi")
async def list_rewards(email: Optional[str] = None, ident: dict = Depends(wajib_login)):
    # Mahasiswa selalu mendapat reward miliknya sendiri (parameter email diabaikan).
    # Operator: semua reward, atau reward milik mahasiswa tertentu jika email diberikan.
    if ident["tipe"] == "mahasiswa":
        return get_reward_konfirmasi_by_email(ident["email"])
    if email:
        return get_reward_konfirmasi_by_email(email)
    return get_all_reward_konfirmasi()

_VALID_REWARD_STATUSES = {"menunggu", "diproses", "selesai", "dikembalikan", "ditolak"}  # Status reward yang diizinkan

@app.patch("/reward-konfirmasi/{reward_id}/status")
async def update_reward(reward_id: int, body: RewardStatusUpdate, background_tasks: BackgroundTasks, ident: dict = Depends(wajib_operator)):
    # Mengubah status reward, mencatat audit log, dan mengirim email notifikasi sesuai status baru.
    if body.status not in _VALID_REWARD_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status tidak valid. Gunakan: {', '.join(sorted(_VALID_REWARD_STATUSES))}")
    op = ident["op"]
    reward = get_reward_konfirmasi_by_id(reward_id)
    update_reward_status(reward_id, body.status, body.catatan)
    insert_audit_log(op["id"], op["nama"], f"reward_{body.status}", "reward", reward_id,
                     reward.get("judul_lomba") if reward else None)
    if reward:
        claim = get_claim_by_id(reward["claim_id"])
        if claim:
            email      = reward["mahasiswa_email"]
            nama_lomba = claim["nama_lomba"]
            if body.status == "diproses":
                background_tasks.add_task(kirim_email_reward_diproses, email, nama_lomba)
            elif body.status == "dikembalikan":
                background_tasks.add_task(kirim_email_reward_dikembalikan, email, nama_lomba, body.catatan)
            elif body.status == "selesai":
                background_tasks.add_task(kirim_email_reward_selesai, email, nama_lomba)
    return {"success": True}

@app.get("/reward-konfirmasi/{claim_id}")
async def get_reward(claim_id: int, ident: dict = Depends(wajib_login)):
    # Mengambil data reward konfirmasi berdasarkan claim_id (bukan reward_id) — pemilik, anggota kelompok, atau operator.
    pastikan_boleh_lihat_klaim(ident, claim_id)
    data = get_reward_konfirmasi_by_claim_id(claim_id)
    if not data:
        raise HTTPException(status_code=404, detail="Data reward tidak ditemukan")
    return data

@app.put("/reward-konfirmasi/{reward_id}", dependencies=[Depends(limit_upload)])
def resubmit_reward(
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
    ident: dict = Depends(wajib_mahasiswa),
):
    # Memperbarui data reward konfirmasi setelah dikembalikan oleh operator untuk diperbaiki — hanya pemilik reward.
    reward = get_reward_konfirmasi_by_id(reward_id)
    if not reward:
        raise HTTPException(status_code=404, detail="Data reward tidak ditemukan")
    if (reward.get("mahasiswa_email") or "").lower() != ident["email"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    saved = []  # path file yang sudah ditulis, dihapus lagi jika proses gagal
    ensure_disk_space(UPLOAD_FOLDER)

    def save_file(upload: Optional[UploadFile]) -> Optional[str]:
        # Menyimpan file upload baru ke folder uploads; kembalikan path-nya atau None jika tidak ada file.
        if not upload or not upload.filename:
            return None
        contents = read_limited(upload, MAX_FILE_SIZE)
        validasi_jenis_file(upload.filename, contents)  # hanya PDF/JPG/PNG
        path = os.path.join(UPLOAD_FOLDER, f"reward_{uuid.uuid4().hex}_{bersihkan_nama_file(upload.filename)}")
        with open(path, "wb") as f:
            f.write(contents)
        saved.append(path)
        return path

    try:
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
    except Exception:
        _hapus_file(saved)
        raise


# ── Autentikasi & Manajemen Operator ─────────────────────────────────────────
# Body JSON untuk POST /login-operator
class OperatorLoginRequest(BaseModel):
    username: str
    password: str

# Body JSON untuk POST /operators — data akun operator baru yang akan dibuat oleh superadmin
class CreateOperatorRequest(BaseModel):
    username: str
    password: str
    nama: str
    email: str
    role: Optional[str] = "operator"  # nilai valid: "operator" atau "superadmin"

# Autentikasi operator memakai token sesi acak (lihat backend/auth.py). Token diberikan saat login,
# disimpan Next.js di cookie httpOnly, dan dikirim ke backend sebagai Authorization: Bearer <token>.
@app.post("/login-operator")
async def login_operator(body: OperatorLoginRequest):
    # Autentikasi operator dengan username dan password; mengembalikan data user dan token sesi jika berhasil.
    # Setelah LOGIN_MAKS_GAGAL kali salah password, username dikunci sementara (mencegah tebak password).
    kunci = body.username.strip().lower()
    sisa = login_gagal.sisa_kunci(kunci)
    if sisa:
        tolak_terlalu_banyak(sisa, f"Terlalu banyak percobaan login gagal. Coba lagi dalam {-(-sisa // 60)} menit.")
    user = authenticate_operator(body.username, body.password)
    if not user:
        login_gagal.catat_gagal(kunci)
        raise HTTPException(status_code=401, detail="Username atau password salah")
    login_gagal.reset(kunci)
    token = buat_sesi_operator(user["id"])
    return {"success": True, "user": user, "token": token}

@app.post("/operator/logout")
async def logout_operator(ident: dict = Depends(wajib_operator)):
    # Mengakhiri sesi operator yang sedang dipakai.
    hapus_sesi_operator(ident["token"])
    return {"success": True}

# Body JSON untuk POST /operator/lupa-password — hanya membutuhkan email operator
class LupaPasswordRequest(BaseModel):
    email: str

# Body JSON untuk POST /operator/reset-password — verifikasi OTP lalu set password baru
class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

@app.post("/operator/lupa-password")
async def lupa_password_operator(body: LupaPasswordRequest, background_tasks: BackgroundTasks):
    # Membuat OTP reset password dan mengirimkannya ke email operator jika terdaftar.
    # Permintaan dibatasi per email (OTP_MAKS_PERMINTAAN) agar email operator tidak dibanjiri kode.
    retry = otp_permintaan.check(body.email.strip().lower())
    if retry is not None:
        tolak_terlalu_banyak(retry, f"Terlalu banyak permintaan kode OTP. Coba lagi dalam {-(-retry // 60)} menit.")
    op = get_operator_by_email(body.email)
    if op:
        otp = str(100000 + secrets.randbelow(900000))  # OTP 6 digit dari generator acak yang aman
        create_operator_otp(body.email, otp)             # OTP hanya disimpan untuk email yang terdaftar
        otp_gagal.reset(body.email.strip().lower())      # kode baru → hitungan salah OTP diulang
        background_tasks.add_task(kirim_email_otp_reset_operator, op["email"], op["nama"], otp)
    # Selalu return sukses meski email tidak terdaftar — mencegah penyerang menebak email yang ada
    return {"success": True, "pesan": "Jika email terdaftar, kode OTP akan dikirimkan."}

@app.post("/operator/reset-password")
async def reset_password_operator(body: ResetPasswordRequest):
    # Mereset password operator menggunakan OTP yang valid; OTP langsung hangus setelah digunakan.
    if not body.new_password or len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password baru minimal 8 karakter")
    # Setelah OTP_MAKS_GAGAL kali salah, kode tidak bisa dipakai lagi; operator harus meminta kode baru
    kunci = body.email.strip().lower()
    if otp_gagal.sisa_kunci(kunci):
        raise HTTPException(status_code=429, detail="Terlalu banyak percobaan kode OTP yang salah. Silakan minta kode OTP baru.")
    if not verify_operator_otp(body.email, body.otp):
        otp_gagal.catat_gagal(kunci)
        raise HTTPException(status_code=400, detail="Kode OTP tidak valid atau sudah kadaluarsa")
    otp_gagal.reset(kunci)
    op = get_operator_by_email(body.email)
    if not op:
        raise HTTPException(status_code=400, detail="Kode OTP tidak valid atau sudah kadaluarsa")
    update_operator_password(op["username"], body.new_password)
    hapus_semua_sesi_operator(op["id"])  # semua perangkat yang masih login harus login ulang
    return {"success": True}

@app.get("/operators")
async def list_operators(ident: dict = Depends(wajib_superadmin)):
    # Mengambil daftar semua akun operator yang ada — hanya superadmin.
    return get_all_operators()

@app.post("/operators")
async def add_operator(
    body: CreateOperatorRequest,
    ident: dict = Depends(wajib_superadmin),
):
    # Membuat akun operator baru dengan validasi minimal 8 karakter password — hanya superadmin.
    op = ident["op"]
    if not body.password or len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password minimal 8 karakter")
    role = body.role or "operator"
    ok = create_operator(body.username, body.password, body.nama, body.email, role)
    if not ok:
        raise HTTPException(status_code=409, detail="Username atau email sudah digunakan")
    insert_audit_log(op["id"], op["nama"], "tambah_operator", "operator", None, f"{body.nama}|{role}")
    return {"success": True}

# Body JSON untuk PATCH /operators/{id}/password — operator mengisi old_password, superadmin tidak perlu
class ChangePasswordRequest(BaseModel):
    new_password: str
    old_password: Optional[str] = None

@app.patch("/operators/{operator_id}/password")
async def change_operator_password(
    operator_id: int,
    body: ChangePasswordRequest,
    ident: dict = Depends(wajib_operator),
):
    # Mengubah password operator; operator hanya bisa mengubah milik sendiri (dengan verifikasi password lama).
    # Superadmin bisa mengubah milik operator lain, kecuali sesama superadmin.
    op     = ident["op"]                         # operator yang melakukan request
    target = get_operator_by_id(operator_id)     # operator yang passwordnya ingin diubah
    if not target:
        raise HTTPException(status_code=404, detail="Operator tidak ditemukan")

    is_self = op["id"] == operator_id   # True jika operator mengubah password miliknya sendiri

    # Operator biasa hanya boleh ubah password sendiri; superadmin boleh ubah milik operator lain
    if not is_self and op.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Akses ditolak: hanya Super Admin yang dapat mengubah password operator lain")
    # Superadmin tidak boleh mengubah password superadmin lain — mencegah privilege escalation
    if not is_self and target.get("role") == "superadmin":
        raise HTTPException(status_code=403, detail="Akses ditolak: password Super Admin lain tidak dapat diubah")

    if is_self:
        # Operator yang mengubah milik sendiri harus memverifikasi password lama terlebih dahulu
        if not body.old_password:
            raise HTTPException(status_code=400, detail="Password lama diperlukan")
        if not authenticate_operator(target["username"], body.old_password):
            raise HTTPException(status_code=401, detail="Password lama tidak sesuai")

    if not body.new_password or len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password baru minimal 8 karakter")

    update_operator_password(target["username"], body.new_password)
    # Sesi lain milik operator target diakhiri; sesi yang sedang dipakai untuk mengganti password sendiri tetap aktif
    hapus_semua_sesi_operator(operator_id, kecuali_token=ident["token"] if is_self else None)
    insert_audit_log(op["id"], op["nama"], "ganti_password", "operator", operator_id, f"{target['nama']}|{target['role']}")
    return {"success": True}

# Body JSON untuk DELETE /operators/{id} — superadmin harus konfirmasi dengan password sendiri sebelum hapus
class DeleteOperatorBody(BaseModel):
    current_password: Optional[str] = None

@app.delete("/operators/{operator_id}")
async def remove_operator(
    operator_id: int,
    body: DeleteOperatorBody = DeleteOperatorBody(),
    ident: dict = Depends(wajib_superadmin),
):
    # Menghapus akun operator dengan konfirmasi password superadmin; tidak bisa menghapus superadmin terakhir.
    # Sesi login operator yang dihapus ikut terhapus (ON DELETE CASCADE di OPERATOR_SESI).
    op = ident["op"]
    if not body.current_password:
        raise HTTPException(status_code=400, detail="Password diperlukan untuk mengkonfirmasi penghapusan")
    if not authenticate_operator(op["username"], body.current_password):
        raise HTTPException(status_code=401, detail="Password salah")
    target = get_operator_by_id(operator_id)
    ok = delete_operator(operator_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus: akun tidak ditemukan atau merupakan super admin terakhir dalam sistem")
    detail_hapus = f"{target['nama']}|{target['role']}" if target else None
    insert_audit_log(op["id"], op["nama"], "hapus_operator", "operator", operator_id, detail_hapus)
    return {"success": True}
