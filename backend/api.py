from fastapi import FastAPI, UploadFile, File, Form
import shutil
import os

from database import insert_claim

app = FastAPI()

UPLOAD_FOLDER = "uploads"

@app.post("/upload")
async def upload_certificate(
    nama_lomba: str = Form(...),
    tingkat: str = Form(...),
    tanggal: str = Form(...),
    peringkat: str = Form(...),
    file: UploadFile = File(...)
):

    file_location = f"{UPLOAD_FOLDER}/{file.filename}"

    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    insert_claim(
        nama_lomba,
        tingkat,
        tanggal,
        peringkat,
        file_location
    )

    return {"message": "Upload berhasil"}