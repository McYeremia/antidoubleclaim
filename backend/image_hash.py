# Modul untuk menghasilkan pHash dari gambar/PDF dan menghitung kemiripan visual antar dua hash.
from PIL import Image
import imagehash
import os
from pdf2image import convert_from_path

# Path ke Poppler, dibutuhkan untuk konversi PDF ke gambar. Bisa diubah via .env.
POPPLER_PATH = os.getenv("POPPLER_PATH", r"C:\poppler\Library\bin")


def generate_phash(file_path):
    # Menghasilkan perceptual hash (pHash) dari file gambar (.jpg/.png) atau PDF.
    extension = os.path.splitext(file_path)[1].lower()

    allowed_ext = [".jpg", ".jpeg", ".png", ".pdf"]

    if extension not in allowed_ext:
        raise ValueError("Format file tidak didukung")

    if extension == ".pdf":
        # Untuk PDF, ambil halaman pertama lalu konversi ke gambar
        images = convert_from_path(
            file_path,
            poppler_path=POPPLER_PATH
        )
        image = images[0]
    else:
        image = Image.open(file_path)

    phash = imagehash.phash(image)

    return phash


def hamming_distance(hash1, hash2):
    # Menghitung Hamming distance antara dua pHash — semakin kecil nilainya, semakin mirip gambarnya.
    return hash1 - hash2
