# Modul untuk menghitung kemiripan teks antara dua string nama lomba menggunakan algoritma TSR (Token Sort Ratio).
from rapidfuzz import fuzz

def normalize_text(text):
    # Mengubah teks ke huruf kecil dan menghapus spasi di awal/akhir sebelum dibandingkan.
    return text.lower().strip()

def token_sort_ratio(text1, text2):
    # Menghitung skor kemiripan Token Sort Ratio (0–100) antara dua string nama.
    # TSR mengurutkan token sebelum dibandingkan sehingga tidak terpengaruh urutan kata.
    t1 = normalize_text(text1)
    t2 = normalize_text(text2)
    return fuzz.token_sort_ratio(t1, t2)
