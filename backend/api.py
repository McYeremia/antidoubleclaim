# Modul utama FastAPI: mendefinisikan semua endpoint REST untuk klaim, pengajuan, reward, operator, periode, dan simulator.
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import shutil
import os
import json
import traceback
import uuid
import io
import random
import imagehash
from PIL import Image
from pdf2image import convert_from_bytes

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
    PHASH_THRESHOLD, FUZZY_THRESHOLD,
)
from backend.nim_parser import parse_nim, is_valid_student_email
from backend.image_hash import POPPLER_PATH
from backend.text_similarity import token_sort_ratio
from backend.email_service import (
    kirim_email_klaim_disetujui,
    kirim_email_klaim_tidak_lolos,
    kirim_email_reward_diproses,
    kirim_email_reward_dikembalikan,
    kirim_email_reward_selesai,
    kirim_email_otp_reset_operator,
)

app = FastAPI()

create_database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
MAX_FILE_SIZE = 3 * 1024 * 1024  # Batas ukuran file upload: maks 3 MB per file

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.mount("/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")

# ══════════════════════════════════════════════════════════════════════════════
# ── SIMULATOR ─ Bagian Terpisah: Alat Pengujian & Visualisasi Deteksi Duplikat
# Endpoint di bawah ini BUKAN bagian dari alur produksi klaim.
# Tidak ada data yang disimpan ke database atau disk.
# Hanya untuk keperluan pengujian dan demonstrasi cara kerja sistem.
# ══════════════════════════════════════════════════════════════════════════════

# Body JSON untuk endpoint /simulator/fuzzy — dua judul yang ingin dibandingkan
class SimulatorFuzzyInput(BaseModel):
    title1: str
    title2: str

def _open_image_from_bytes(filename: str, contents: bytes) -> Image.Image:
    # Membuka gambar dari bytes tanpa menyimpan ke disk. Mendukung JPG, PNG, PDF (halaman pertama).
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        images = convert_from_bytes(contents, poppler_path=POPPLER_PATH)
        if not images:
            raise ValueError("PDF tidak mengandung halaman yang bisa dibaca")
        return images[0]
    elif ext in (".jpg", ".jpeg", ".png"):
        return Image.open(io.BytesIO(contents))
    else:
        raise ValueError(f"Format tidak didukung: {ext}. Gunakan JPG, PNG, atau PDF.")

@app.post("/simulator/phash")
async def simulator_phash(
    image1: UploadFile = File(...),
    image2: UploadFile = File(...),
    x_operator_id: Optional[str] = Header(None, alias="x-operator-id"),
):
    # SIMULATOR: Menghitung dan membandingkan pHash dua gambar in-memory; tidak menyimpan data apapun.
    contents1 = await image1.read()
    contents2 = await image2.read()

    if len(contents1) > MAX_FILE_SIZE or len(contents2) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Ukuran file melebihi batas 3 MB")

    try:
        img1 = _open_image_from_bytes(image1.filename or "image1.jpg", contents1)
        img2 = _open_image_from_bytes(image2.filename or "image2.jpg", contents2)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=400, detail="File gambar tidak valid atau rusak")

    try:
        hash1 = imagehash.phash(img1)
        hash2 = imagehash.phash(img2)
    except Exception:
        raise HTTPException(status_code=400, detail="Gagal menghitung pHash gambar")

    distance    = int(hash1 - hash2)
    bits1       = [int(b) for b in hash1.hash.flatten()]
    bits2       = [int(b) for b in hash2.hash.flatten()]
    diff_bits   = [int(b1 ^ b2) for b1, b2 in zip(bits1, bits2)]
    similarity  = round((1 - distance / 64) * 100, 2)

    return {
        "hash1_hex":          str(hash1),
        "hash2_hex":          str(hash2),
        "hash1_bits":         bits1,
        "hash2_bits":         bits2,
        "diff_bits":          diff_bits,
        "hamming_distance":   distance,
        "similarity_percent": similarity,
        "threshold":          PHASH_THRESHOLD,
        "is_duplicate":       distance <= PHASH_THRESHOLD,
        "steps": {
            "resize":    "32x32 px",
            "colorspace":"Grayscale",
            "dct":       "DCT 2D → ambil koefisien 8x8 frekuensi rendah (kiri atas)",
            "compare":   "Rata-rata koefisien → binary (>avg=1) → XOR antar hash = Hamming distance",
        },
    }

@app.post("/simulator/fuzzy")
async def simulator_fuzzy(
    body: SimulatorFuzzyInput,
    x_operator_id: Optional[str] = Header(None, alias="x-operator-id"),
):
    # SIMULATOR: Menghitung skor Token Sort Ratio antara dua judul; tidak ada data yang disimpan.
    if not body.title1.strip() or not body.title2.strip():
        raise HTTPException(status_code=400, detail="Judul tidak boleh kosong")

    t1_orig = body.title1
    t2_orig = body.title2
    t1_norm = t1_orig.lower().strip()
    t2_norm = t2_orig.lower().strip()

    tokens1        = t1_norm.split()
    tokens2        = t2_norm.split()
    sorted_tokens1 = sorted(tokens1)
    sorted_tokens2 = sorted(tokens2)
    sorted1        = " ".join(sorted_tokens1)
    sorted2        = " ".join(sorted_tokens2)

    score = token_sort_ratio(t1_orig, t2_orig)

    return {
        "original1":      t1_orig,
        "original2":      t2_orig,
        "normalized1":    t1_norm,
        "normalized2":    t2_norm,
        "sorted1":        sorted1,
        "sorted2":        sorted2,
        "score":          score,
        "threshold":      FUZZY_THRESHOLD,
        "is_duplicate":   score >= FUZZY_THRESHOLD,
        "tokens1":        tokens1,
        "tokens2":        tokens2,
        "sorted_tokens1": sorted_tokens1,
        "sorted_tokens2": sorted_tokens2,
    }

# ══════════════════════════════════════════════════════════════════════════════
# ── AKHIR SIMULATOR ───────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

# ── Root ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    # Endpoint root untuk verifikasi bahwa backend aktif.
    return {"message": "Backend Anti-Double Claim Aktif"}

# ── Statistik Visualisasi ────────────────────────────────────────────────────
@app.get("/stats/visualisasi")
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
@app.get("/stats/export")
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
async def get_profil(email: str):
    # Mengambil data profil tersimpan (nomor WA, rekening) milik mahasiswa berdasarkan email.
    if not is_valid_student_email(email):
        raise HTTPException(status_code=400, detail="Email tidak valid")
    return get_profil_mahasiswa(email)

@app.put("/profil")
async def update_profil(email: str, body: ProfilUpdate):
    # Memperbarui atau membuat data profil mahasiswa (nomor WA, nama dan nomor rekening).
    if not is_valid_student_email(email):
        raise HTTPException(status_code=400, detail="Email tidak valid")
    upsert_profil_mahasiswa(email, body.model_dump())
    return {"success": True}

# ── Periode Klaim ─────────────────────────────────────────────────────────────
# Body JSON untuk POST /periode — data yang dibutuhkan saat membuat periode klaim baru
class PeriodeCreate(BaseModel):
    nama:            str
    tanggal_mulai:   str
    tanggal_selesai: str
    dibuat_oleh:     Optional[str] = None
    semester:        Optional[int] = 0
    tahun:           Optional[int] = 0

@app.get("/periode/aktif")
async def periode_aktif():
    # Mengambil periode klaim yang statusnya 'aktif' dan waktunya mencakup hari ini.
    result = get_periode_aktif()
    if not result:
        return {"aktif": False, "periode": None}
    return {"aktif": True, "periode": result}

@app.get("/periode/terkini")
async def periode_terkini():
    # Mengambil periode yang mencakup hari ini berdasarkan tanggal (tidak peduli status aktif/tutup).
    result = get_periode_terkini()
    if not result:
        return {"ditemukan": False, "periode": None}
    aktif_sekarang = result.get("status") == "aktif"
    return {"ditemukan": True, "aktif": aktif_sekarang, "periode": result}

@app.get("/periode")
async def list_periode():
    # Mengambil semua periode klaim yang ada di database.
    return get_all_periode()

@app.post("/periode")
async def buat_periode(body: PeriodeCreate, x_operator_id: Optional[str] = Header(None)):
    # Membuat periode klaim baru dan mencatat aksi ke audit log — hanya operator.
    op = _require_operator(x_operator_id)
    periode_id = create_periode(body.model_dump())
    insert_audit_log(op["id"], op["nama"], "buat_periode", "periode", periode_id, body.nama)
    return {"success": True, "id": periode_id}

@app.put("/periode/{periode_id}")
async def ubah_status_periode(periode_id: int, status: str, x_operator_id: Optional[str] = Header(None)):
    # Mengubah status periode (tutup/aktif/ditutup) dengan validasi transisi — hanya operator.
    op = _require_operator(x_operator_id)
    result = update_periode_status(periode_id, status)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail=result.get("alasan", "Gagal mengubah status periode."))
    insert_audit_log(op["id"], op["nama"], f"periode_{status}", "periode", periode_id, get_periode_nama(periode_id))
    return {"success": True}

@app.post("/periode/{periode_id}/arsip")
async def arsip_periode(periode_id: int, x_operator_id: Optional[str] = Header(None)):
    # Mengarsipkan periode beserta semua klaim dan reward di dalamnya — hanya superadmin.
    op = _require_superadmin(x_operator_id)
    result = arsipkan_periode(periode_id)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail=result.get("alasan", "Tidak dapat mengarsipkan"))
    insert_audit_log(op["id"], op["nama"], "arsip_periode", "periode", periode_id, get_periode_nama(periode_id))
    return {"success": True}

@app.get("/periode/{periode_id}/claims")
async def claims_by_periode(periode_id: int):
    # Mengambil semua klaim yang terhubung ke periode tertentu.
    return get_claims_by_periode_id(periode_id)

@app.get("/periode/{periode_id}/rewards")
async def rewards_by_periode(periode_id: int):
    # Mengambil semua data reward yang terhubung ke periode tertentu.
    return get_rewards_by_periode_id(periode_id)

# Body JSON untuk PATCH /periode/{id} — field periode yang boleh diedit setelah dibuat
class PeriodeEdit(BaseModel):
    nama:            str
    tanggal_mulai:   str
    tanggal_selesai: str

@app.patch("/periode/{periode_id}")
async def edit_periode(periode_id: int, body: PeriodeEdit, x_operator_id: Optional[str] = Header(None)):
    # Mengedit nama dan tanggal periode yang belum diarsipkan — hanya operator.
    op = _require_operator(x_operator_id)
    update_periode_data(periode_id, body.model_dump())
    insert_audit_log(op["id"], op["nama"], "edit_periode", "periode", periode_id, body.nama)
    return {"success": True}

@app.delete("/periode/{periode_id}")
async def hapus_periode(periode_id: int, x_operator_id: Optional[str] = Header(None)):
    # Menghapus periode yang tidak sedang aktif; gagal jika periode masih aktif — hanya superadmin.
    op = _require_superadmin(x_operator_id)
    nama_periode = get_periode_nama(periode_id)
    ok = delete_periode(periode_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus: periode tidak ditemukan atau sedang aktif.")
    insert_audit_log(op["id"], op["nama"], "hapus_periode", "periode", periode_id, nama_periode)
    return {"success": True}

@app.post("/admin/reset-data")
async def reset_data(x_operator_id: Optional[str] = Header(None)):
    # Menghapus semua data (klaim, pengajuan, reward, periode) kecuali tabel USERS — hanya superadmin.
    op = _require_superadmin(x_operator_id)
    reset_semua_data()
    insert_audit_log(op["id"], op["nama"], "reset_semua_data", None, None, None)
    return {"success": True, "pesan": "Semua data berhasil dihapus. Tabel USERS tetap utuh."}

# ── Audit Log ──────────────────────────────────────────────────────────────────────────
@app.get("/audit-log")
async def list_audit_log(
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
    x_operator_id: Optional[str] = Header(None),
):
    # Mengambil riwayat aktivitas operator dengan filter rentang tanggal — hanya superadmin.
    _require_superadmin(x_operator_id)
    return get_audit_log(date_from=date_from, date_to=date_to)

# ── NIM Info ─────────────────────────────────────────────────────────────────
@app.get("/nim-info")
async def nim_info(email: str):
    # Parsing NIM dari email mahasiswa dan mengembalikan info fakultas, prodi, angkatan.
    return parse_nim(email)

# ── Claims ──────────────────────────────────────────────────────────────────
@app.get("/claims")
async def list_claims(email: str = None):
    # Jika email diberikan, kembalikan klaim milik mahasiswa tersebut; jika tidak, kembalikan semua klaim.
    if email:
        return get_claims_by_email(email)
    return get_all_claims()

@app.get("/klaim-sebagai-anggota")
async def klaim_sebagai_anggota(email: str):
    # Mengambil klaim di mana mahasiswa terdaftar sebagai anggota kelompok (bukan ketua).
    if not is_valid_student_email(email):
        return []
    nim = email.split("@")[0]
    return get_klaim_sebagai_anggota(nim)

@app.get("/claims/ditolak")
async def get_claims_ditolak():
    # Mengambil semua klaim berstatus ditolak untuk riwayat di panel operator.
    return get_ditolak_claims()

@app.get("/claims/{claim_id}")
async def detail_claim(claim_id: int):
    # Mengambil detail satu klaim beserta info operator yang memverifikasi.
    claim = get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Klaim tidak ditemukan")
    return claim

@app.patch("/claims/{claim_id}/approve")
async def approve(claim_id: int, background_tasks: BackgroundTasks, x_operator_id: Optional[str] = Header(None)):
    # Menyetujui klaim, mencatat audit log, dan mengirim email notifikasi ke mahasiswa.
    op = _require_operator(x_operator_id)
    claim = get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Klaim tidak ditemukan")
    approve_claim(claim_id, operator_id=int(x_operator_id))
    insert_audit_log(op["id"], op["nama"], "approve_klaim", "klaim", claim_id, claim["nama_lomba"])
    background_tasks.add_task(kirim_email_klaim_disetujui, claim["mahasiswa_email"], claim["nama_lomba"])
    return {"message": "Klaim disetujui", "id": claim_id}

# Body JSON untuk DELETE /claims/{id} — catatan alasan penolakan (opsional)
class DiscardBody(BaseModel):
    catatan: Optional[str] = None

@app.delete("/claims/{claim_id}")
async def discard(claim_id: int, background_tasks: BackgroundTasks, body: Optional[DiscardBody] = None, x_operator_id: Optional[str] = Header(None)):
    # Menolak klaim dengan catatan alasan, mencatat audit log, dan mengirim email notifikasi ke mahasiswa.
    op = _require_operator(x_operator_id)
    claim = get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Klaim tidak ditemukan")
    catatan = body.catatan if body else None
    reject_claim(claim_id, operator_id=int(x_operator_id), catatan=catatan)
    insert_audit_log(op["id"], op["nama"], "tolak_klaim", "klaim", claim_id, claim["nama_lomba"])
    background_tasks.add_task(kirim_email_klaim_tidak_lolos, claim["mahasiswa_email"], claim["nama_lomba"], catatan)
    return {"message": "Klaim ditolak", "id": claim_id}

# ── Upload ───────────────────────────────────────────────────────────────────
@app.post("/upload")
async def upload_certificate(
    nama_lomba: str = Form(...),
    tingkat: str = Form(...),
    tanggal: str = Form(...),
    peringkat: str = Form(...),
    mahasiswa_email: str = Form(...),
    nama_display: str = Form(...),
    file: UploadFile = File(...),
    kategori_simkatmawa: Optional[str] = Form(None),
):
    # Menerima upload sertifikat, menyimpan file ke disk, dan menjalankan deteksi duplikat.
    try:
        print(f"--- Menerima upload: {nama_lomba} dari {mahasiswa_email} ---")

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="Ukuran file melebihi batas maksimal 3 MB")

        # Nama file diberi prefix UUID agar unik meski mahasiswa mengirim file bernama sama
        unique_name   = f"{uuid.uuid4().hex}_{file.filename}"
        file_location = os.path.join(UPLOAD_FOLDER, unique_name)
        with open(file_location, "wb") as buffer:
            buffer.write(contents)
        print(f"File disimpan di: {file_location}")

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
    # Menerima data pengajuan SIMKATMAWA lengkap beserta file-file dokumen pendukung.
    try:
        def save_file(upload: Optional[UploadFile], prefix: str) -> Optional[str]:
            # Menyimpan file upload ke folder uploads dengan nama unik; kembalikan path-nya.
            if not upload or not upload.filename:
                return None
            contents = upload.file.read()
            if len(contents) > MAX_FILE_SIZE:
                raise HTTPException(status_code=413, detail=f"File '{upload.filename}' melebihi batas maksimal 3 MB")
            fname    = f"{prefix}_{uuid.uuid4().hex}_{upload.filename}"
            fpath    = os.path.join(UPLOAD_FOLDER, fname)
            with open(fpath, "wb") as buf:
                buf.write(contents)
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
    # Mengambil semua pengajuan milik mahasiswa berdasarkan email.
    return get_pengajuan_by_email(email)

@app.get("/pengajuan/by-claim/{claim_id}")
async def pengajuan_by_claim(claim_id: int):
    # Mengambil data pengajuan yang terhubung ke klaim tertentu.
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
async def edit_pengajuan(pengajuan_id: int, body: PengajuanUpdate):
    # Mengedit data pengajuan selama klaimnya belum diproses operator (belum dicek/perlu ditinjau).
    pengajuan = get_pengajuan_by_id(pengajuan_id)
    if not pengajuan:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
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
    # Menerima data konfirmasi reward dari mahasiswa beserta dokumen rekening dan laporan akhir.
    try:
        def save_file(upload: Optional[UploadFile], prefix: str) -> Optional[str]:
            # Menyimpan file upload ke folder uploads dengan nama unik; kembalikan path-nya.
            if not upload or not upload.filename:
                return None
            contents = upload.file.read()
            if len(contents) > MAX_FILE_SIZE:
                raise HTTPException(status_code=413, detail=f"File '{upload.filename}' melebihi batas maksimal 3 MB")
            fname = f"{prefix}_{uuid.uuid4().hex}_{upload.filename}"
            fpath = os.path.join(UPLOAD_FOLDER, fname)
            with open(fpath, "wb") as buf:
                buf.write(contents)
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


# Body JSON untuk PATCH /reward-konfirmasi/{id}/status — status baru dan catatan opsional dari operator
class RewardStatusUpdate(BaseModel):
    status: str
    catatan: Optional[str] = None

@app.get("/reward-konfirmasi")
async def list_rewards(email: Optional[str] = None):
    # Mengambil semua reward (tanpa filter) atau reward milik mahasiswa tertentu berdasarkan email.
    if email:
        return get_reward_konfirmasi_by_email(email)
    return get_all_reward_konfirmasi()

_VALID_REWARD_STATUSES = {"menunggu", "diproses", "selesai", "dikembalikan", "ditolak"}  # Status reward yang diizinkan

@app.patch("/reward-konfirmasi/{reward_id}/status")
async def update_reward(reward_id: int, body: RewardStatusUpdate, background_tasks: BackgroundTasks, x_operator_id: Optional[str] = Header(None)):
    # Mengubah status reward, mencatat audit log, dan mengirim email notifikasi sesuai status baru.
    if body.status not in _VALID_REWARD_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status tidak valid. Gunakan: {', '.join(sorted(_VALID_REWARD_STATUSES))}")
    op = _require_operator(x_operator_id)
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
async def get_reward(claim_id: int):
    # Mengambil data reward konfirmasi berdasarkan claim_id (bukan reward_id).
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
    # Memperbarui data reward konfirmasi setelah dikembalikan oleh operator untuk diperbaiki.
    def save_file(upload: Optional[UploadFile]) -> Optional[str]:
        # Menyimpan file upload baru ke folder uploads; kembalikan path-nya atau None jika tidak ada file.
        if not upload or not upload.filename:
            return None
        contents = upload.file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File '{upload.filename}' melebihi batas maksimal 3 MB")
        path = os.path.join(UPLOAD_FOLDER, f"reward_{uuid.uuid4().hex}_{upload.filename}")
        with open(path, "wb") as f:
            f.write(contents)
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

# Guard function: dipanggil di awal setiap endpoint yang membutuhkan login operator.
# Autentikasi menggunakan header X-Operator-ID (ID numerik dari DB), bukan token/JWT.
# Alasan tidak pakai JWT: sistem digunakan dalam jaringan kampus tertutup, cukup ID sesi.
def _require_operator(x_operator_id: Optional[str]):
    # Raise 401/403 jika header tidak ada atau ID tidak ada di DB. Kembalikan data operator.
    if not x_operator_id or not x_operator_id.isdigit():
        raise HTTPException(status_code=401, detail="Akses ditolak: header X-Operator-ID diperlukan")
    op = get_operator_by_id(int(x_operator_id))
    if not op:
        raise HTTPException(status_code=403, detail="Akses ditolak: operator tidak ditemukan")
    return op

# Guard function: dipanggil di endpoint yang hanya boleh diakses superadmin (hapus periode, kelola operator, dll.)
def _require_superadmin(x_operator_id: Optional[str]):
    # Raise 403 jika requester bukan superadmin. Kembalikan data operator.
    op = _require_operator(x_operator_id)
    if op.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Akses ditolak: hanya Super Admin yang dapat melakukan ini")
    return op

@app.post("/login-operator")
async def login_operator(body: OperatorLoginRequest):
    # Autentikasi operator dengan username dan password; mengembalikan data user jika berhasil.
    user = authenticate_operator(body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Username atau password salah")
    return {"success": True, "user": user}

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
    op  = get_operator_by_email(body.email)
    otp = str(random.randint(100000, 999999))   # OTP 6 digit acak
    create_operator_otp(body.email, otp)         # simpan ke DB meski email tidak terdaftar
    if op:
        background_tasks.add_task(kirim_email_otp_reset_operator, op["email"], op["nama"], otp)
    # Selalu return sukses meski email tidak terdaftar — mencegah penyerang menebak email yang ada
    return {"success": True, "pesan": "Jika email terdaftar, kode OTP akan dikirimkan."}

@app.post("/operator/reset-password")
async def reset_password_operator(body: ResetPasswordRequest):
    # Mereset password operator menggunakan OTP yang valid; OTP langsung hangus setelah digunakan.
    if not body.new_password or len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password baru minimal 8 karakter")
    if not verify_operator_otp(body.email, body.otp):
        raise HTTPException(status_code=400, detail="Kode OTP tidak valid atau sudah kadaluarsa")
    op = get_operator_by_email(body.email)
    if not op:
        raise HTTPException(status_code=400, detail="Kode OTP tidak valid atau sudah kadaluarsa")
    update_operator_password(op["username"], body.new_password)
    return {"success": True}

@app.get("/operators")
async def list_operators(x_operator_id: Optional[str] = Header(None)):
    # Mengambil daftar semua akun operator yang ada — hanya superadmin.
    _require_superadmin(x_operator_id)
    return get_all_operators()

@app.post("/operators")
async def add_operator(
    body: CreateOperatorRequest,
    x_operator_id: Optional[str] = Header(None),
):
    # Membuat akun operator baru dengan validasi minimal 8 karakter password — hanya superadmin.
    op = _require_superadmin(x_operator_id)
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
    x_operator_id: Optional[str] = Header(None),
):
    # Mengubah password operator; operator hanya bisa mengubah milik sendiri (dengan verifikasi password lama).
    # Superadmin bisa mengubah milik operator lain, kecuali sesama superadmin.
    op     = _require_operator(x_operator_id)    # operator yang melakukan request
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
    insert_audit_log(op["id"], op["nama"], "ganti_password", "operator", operator_id, f"{target['nama']}|{target['role']}")
    return {"success": True}

# Body JSON untuk DELETE /operators/{id} — superadmin harus konfirmasi dengan password sendiri sebelum hapus
class DeleteOperatorBody(BaseModel):
    current_password: Optional[str] = None

@app.delete("/operators/{operator_id}")
async def remove_operator(
    operator_id: int,
    body: DeleteOperatorBody = DeleteOperatorBody(),
    x_operator_id: Optional[str] = Header(None),
):
    # Menghapus akun operator dengan konfirmasi password superadmin; tidak bisa menghapus superadmin terakhir.
    op = _require_superadmin(x_operator_id)
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
