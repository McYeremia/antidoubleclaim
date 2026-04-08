from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import shutil
import os
import traceback

from backend.database import (
    insert_claim, create_database,
    get_all_claims, get_claim_by_id,
    approve_claim, discard_claim,
)

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

# ── Claims ──────────────────────────────────────────────────────────────────
@app.get("/claims")
async def list_claims():
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
    file: UploadFile = File(...)
):
    try:
        print(f"--- Menerima upload: {nama_lomba} ---")

        file_location = os.path.join(UPLOAD_FOLDER, file.filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"File disimpan di: {file_location}")

        result = insert_claim(nama_lomba, tingkat, tanggal, peringkat, file_location)

        return {
            "uploaded":           result.get("uploaded", True),
            "flagged":            result.get("flagged", False),
            "duplikat_dengan_id": result.get("duplikat_dengan_id"),
            "similarity_nama":    result.get("similarity_nama"),
            "distance_phash":     result.get("distance_phash"),
            "pesan":              result.get("pesan"),
        }

    except Exception as e:
        print("!!! ERROR SAAT UPLOAD !!!")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
