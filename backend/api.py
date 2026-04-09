from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
async def approve(claim_id: int):
    claim = get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Klaim tidak ditemukan")
    approve_claim(claim_id)
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
    keterangan_kelompok: Optional[str]  = Form(None),
    anggota_json:        Optional[str]  = Form(None),
    setuju:              str            = Form("false"),
    claim_id:            Optional[str]  = Form(None),
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
