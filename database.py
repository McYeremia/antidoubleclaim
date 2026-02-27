import sqlite3
from image_hash import generate_phash, hamming_distance
import imagehash

def create_database():
    conn = sqlite3.connect("claims.db")
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_lomba TEXT NOT NULL,
        tingkat TEXT NOT NULL,
        tanggal TEXT NOT NULL,
        peringkat TEXT NOT NULL,
        sertifikat_path TEXT NOT NULL,
        phash TEXT NOT NULL,
        status TEXT DEFAULT 'pending'
    )
    """)

    conn.commit()
    conn.close()


def insert_claim(nama_lomba, tingkat, tanggal, peringkat, sertifikat_path):
    conn = sqlite3.connect("claims.db")
    cursor = conn.cursor()

    phash_obj = generate_phash(sertifikat_path)

    # 🔥 UBAH KE STRING SEBELUM DISIMPAN
    phash_str = str(phash_obj)

    cursor.execute("""
    INSERT INTO claims 
    (nama_lomba, tingkat, tanggal, peringkat, sertifikat_path, phash)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (nama_lomba, tingkat, tanggal, peringkat, sertifikat_path, phash_str))

    conn.commit()
    conn.close()

    print("Data berhasil disimpan dengan pHash:", phash_str)

def get_all_claims():
    conn = sqlite3.connect("claims.db")
    cursor = conn.cursor()

    cursor.execute("SELECT id, phash FROM claims")
    rows = cursor.fetchall()

    conn.close()
    return rows

def compare_with_existing(sertifikat_path, threshold=10):
    conn = sqlite3.connect("claims.db")
    cursor = conn.cursor()

    # Generate hash baru
    new_hash = generate_phash(sertifikat_path)

    # Ambil semua hash lama
    cursor.execute("SELECT id, phash FROM claims")
    rows = cursor.fetchall()

    duplicates = []

    for row in rows:
        claim_id = row[0]
        old_hash_str = row[1]

        # Ubah string kembali ke object hash
        old_hash = imagehash.hex_to_hash(old_hash_str)

        distance = hamming_distance(new_hash, old_hash)

        if distance <= threshold:
            duplicates.append({
                "id": claim_id,
                "distance": distance
            })

    conn.close()

    return duplicates