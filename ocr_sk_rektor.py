"""
OCR Script untuk SK Rektor
Menggunakan PyMuPDF untuk konversi PDF ke gambar, lalu Tesseract untuk OCR
"""
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import os

# Path Tesseract (sesuaikan jika berbeda)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

PDF_PATH = r'SK Rektor/078.B.02.UKDW.2023_SK Rektor tentang Aturan Pemberian Penghargaan Bidang Kemahasiswaan_UKDW.pdf'
OUTPUT_PATH = r'SK Rektor/hasil_ocr.txt'

def ocr_pdf(pdf_path, output_path):
    doc = fitz.open(pdf_path)
    all_text = []

    print(f"Jumlah halaman: {len(doc)}")

    for page_num in range(len(doc)):
        page = doc[page_num]
        print(f"Memproses halaman {page_num + 1}...")

        # Render halaman ke gambar (DPI 300 untuk kualitas OCR yang baik)
        mat = fitz.Matrix(300 / 72, 300 / 72)
        pix = page.get_pixmap(matrix=mat)

        # Konversi ke PIL Image
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))

        # OCR dengan bahasa Indonesia + Inggris
        text = pytesseract.image_to_string(img, lang='ind+eng', config='--psm 6')

        all_text.append(f"=== HALAMAN {page_num + 1} ===")
        all_text.append(text.strip())
        all_text.append("")

    doc.close()

    full_text = "\n".join(all_text)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_text)

    print(f"\nSelesai! Hasil disimpan di: {output_path}")
    print("\n--- PREVIEW (500 karakter pertama) ---")
    print(full_text[:500])

    return full_text

if __name__ == "__main__":
    ocr_pdf(PDF_PATH, OUTPUT_PATH)
