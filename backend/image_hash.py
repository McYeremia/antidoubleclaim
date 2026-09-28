# Modul untuk menghasilkan pHash dari gambar/PDF dan menghitung kemiripan visual antar dua hash.
from PIL import Image
import imagehash
import os
from pdf2image import convert_from_path, pdfinfo_from_path
from pdf2image.exceptions import PDFPageCountError, PDFSyntaxError

# Path ke Poppler, dibutuhkan untuk konversi PDF ke gambar. Bisa diubah via .env.
POPPLER_PATH = os.getenv("POPPLER_PATH", r"C:\poppler\Library\bin")

PDF_DPI          = 200         # resolusi render PDF — jangan diubah agar hasil pHash sama dengan pengujian skripsi
MAX_IMAGE_PIXELS = 60_000_000  # batas piksel gambar/halaman (±8000×7500); mencegah decompression bomb menghabiskan RAM
POPPLER_TIMEOUT  = 30          # detik; PDF yang sengaja dibuat lambat dirender akan dihentikan


class SertifikatTidakValid(ValueError):
    # File sertifikat ditolak karena isinya (format, PDF rusak, dimensi) — ditampilkan ke pengguna sebagai 400.
    pass


def _cek_piksel(width: float, height: float):
    # Tolak gambar/halaman yang jumlah pikselnya melebihi MAX_IMAGE_PIXELS.
    if width * height > MAX_IMAGE_PIXELS:
        raise SertifikatTidakValid("Dimensi gambar sertifikat terlalu besar")


def generate_phash(file_path):
    # Menghasilkan perceptual hash (pHash) dari file gambar (.jpg/.png) atau PDF.
    extension = os.path.splitext(file_path)[1].lower()

    allowed_ext = [".jpg", ".jpeg", ".png", ".pdf"]

    if extension not in allowed_ext:
        raise SertifikatTidakValid("Format file tidak didukung")

    if extension == ".pdf":
        # Cek ukuran halaman pertama dulu (dalam point, 1 inci = 72 pt) sebelum dirender
        try:
            info = pdfinfo_from_path(file_path, poppler_path=POPPLER_PATH, timeout=POPPLER_TIMEOUT)
            # Format dari pdfinfo: "595.276 x 841.89 pts (A4)"
            lebar, sisa = info["Page size"].split(" x ", 1)
            w_pt, h_pt = float(lebar), float(sisa.split()[0])
        except (PDFPageCountError, PDFSyntaxError, KeyError, ValueError):
            raise SertifikatTidakValid("File PDF tidak dapat dibaca")
        _cek_piksel(w_pt / 72 * PDF_DPI, h_pt / 72 * PDF_DPI)
        # Hanya halaman pertama yang dirender — hasil pHash identik dengan merender semua halaman
        images = convert_from_path(
            file_path,
            dpi=PDF_DPI,
            first_page=1,
            last_page=1,
            poppler_path=POPPLER_PATH,
            timeout=POPPLER_TIMEOUT,
        )
        return imagehash.phash(images[0])

    # `with` menutup file setelah dibaca, supaya file yang ditolak bisa langsung dihapus (di Windows file terbuka tidak bisa dihapus)
    try:
        with Image.open(file_path) as image:  # hanya membaca header; piksel baru di-decode saat dipakai
            _cek_piksel(*image.size)
            return imagehash.phash(image)
    except OSError:  # termasuk UnidentifiedImageError (bukan gambar) dan file terpotong
        raise SertifikatTidakValid("File gambar tidak dapat dibaca")


def hamming_distance(hash1, hash2):
    # Menghitung Hamming distance antara dua pHash — semakin kecil nilainya, semakin mirip gambarnya.
    return hash1 - hash2
