import sqlite3
from backend.image_hash import generate_phash, hamming_distance
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

def insert_claim(nama_lomba, tingkat, tanggal, peringkat, sertifikat_path, threshold=10):
    conn = sqlite3.connect("claims.db")
    cursor = conn.cursor()

    # Generate hash baru
    new_hash = generate_phash(sertifikat_path)

    # Ambil semua hash lama
    cursor.execute("SELECT id, phash FROM claims")
    rows = cursor.fetchall()

    status = "pending"

    for row in rows:
        old_hash = imagehash.hex_to_hash(row[1])
        distance = hamming_distance(new_hash, old_hash)

        if distance <= threshold:
            status = "duplikat"
            print(f"⚠ Mirip dengan ID {row[0]} (Distance: {distance})")
            break

    # Simpan ke database
    cursor.execute("""
        INSERT INTO claims 
        (nama_lomba, tingkat, tanggal, peringkat, sertifikat_path, phash, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        nama_lomba,
        tingkat,
        tanggal,
        peringkat,
        sertifikat_path,
        str(new_hash),
        status
    ))

    conn.commit()
    conn.close()

    print("Data disimpan dengan status:", status)

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