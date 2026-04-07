import sqlite3
from backend.image_hash import generate_phash, hamming_distance
from backend.text_similarity import token_sort_ratio
import imagehash

PHASH_THRESHOLD = 10   # Maximum Hamming distance agar dianggap mirip secara visual

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

    new_hash = generate_phash(sertifikat_path)

    cursor.execute("SELECT id, nama_lomba, tingkat, tanggal, peringkat, phash FROM claims")
    rows = cursor.fetchall()

    status = "aman"
    detail = {}

    for row in rows:
        old_id, old_nama, old_tingkat, old_tanggal, old_peringkat, old_phash_str = row

        # --- TAHAP 1: Fuzzy nama lomba (informasi saja, bukan gate) ---
        sim_nama = token_sort_ratio(nama_lomba, old_nama)
        print(f"[Tahap 1] vs ID {old_id}: similarity nama={sim_nama}%")

        # --- TAHAP 2: pHash — gate utama ---
        old_hash = imagehash.hex_to_hash(old_phash_str)
        distance = int(hamming_distance(new_hash, old_hash))
        print(f"[Tahap 2] vs ID {old_id}: Hamming distance={distance}")

        if distance <= PHASH_THRESHOLD:
            # Sertifikat mirip — cek peringkat (exact match karena dari dropdown)
            if peringkat == old_peringkat:
                status = "perlu ditinjau"
                detail = {
                    "duplikat_dengan_id": old_id,
                    "similarity_nama": sim_nama,
                    "distance_phash": distance,
                }
                print(f"⚠ PERLU DITINJAU: sertifikat mirip & peringkat sama dengan ID {old_id}")
                break
            else:
                print(f"[Info] Sertifikat mirip dengan ID {old_id} tapi peringkat berbeda ({old_peringkat} vs {peringkat}) → aman")

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
    return {"status": status, **detail}

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