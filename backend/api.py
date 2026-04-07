from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import shutil
import os
import traceback

from backend.database import insert_claim, create_database, get_all_claims, get_claim_by_id

app = FastAPI()

# Inisialisasi Database
create_database()

# Konfigurasi CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pastikan folder uploads ada di dalam folder backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Serve file sertifikat yang sudah diupload
app.mount("/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")

@app.get("/")
async def root():
    return {"message": "Backend Anti-Double Claim Aktif"}

@app.get("/claims")
async def list_claims():
    return get_all_claims()

@app.get("/claims/{claim_id}")
async def detail_claim(claim_id: int):
    claim = get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Klaim tidak ditemukan")
    return claim

@app.post("/upload")
async def upload_certificate(
    nama_lomba: str = Form(...),
    tingkat: str = Form(...),
    tanggal: str = Form(...),
    peringkat: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        print(f"--- Menerima upload: {nama_lomba} ---")
        
        file_location = os.path.join(UPLOAD_FOLDER, file.filename)

        # Simpan file secara lokal
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"File disimpan di: {file_location}")

        # Masukkan ke database dan jalankan deteksi
        result = insert_claim(
            nama_lomba,
            tingkat,
            tanggal,
            peringkat,
            file_location
        )

        return {
            "message": "Upload berhasil dan data telah dianalisis",
            "status": result["status"],
            "duplikat_dengan_id": result.get("duplikat_dengan_id"),
            "similarity_nama": result.get("similarity_nama"),
            "distance_phash": result.get("distance_phash"),
        }

    except Exception as e:
        print("!!! ERROR SAAT UPLOAD !!!")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
