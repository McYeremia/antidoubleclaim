import sqlite3
import os
from backend.image_hash import generate_phash, hamming_distance
from backend.text_similarity import token_sort_ratio
import imagehash

PHASH_THRESHOLD = 10  # Maximum Hamming distance agar dianggap mirip secara visual

# ---------------------------------------------------------------------------
# Helper koneksi
# ---------------------------------------------------------------------------
def _get_conn():
    conn = sqlite3.connect("claims.db")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

# ---------------------------------------------------------------------------
# Inisialisasi skema database
# ---------------------------------------------------------------------------
def create_database():
    conn = _get_conn()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS USERS (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT    NOT NULL UNIQUE,
        password_hash TEXT    NOT NULL,
        nama          TEXT    NOT NULL,
        email         TEXT    NOT NULL UNIQUE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS OTP_SESSIONS (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        email       TEXT    NOT NULL,
        otp         TEXT    NOT NULL,
        expired_at  TEXT    NOT NULL,
        used        INTEGER NOT NULL DEFAULT 0,
        google_name TEXT    NOT NULL
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_otp_email ON OTP_SESSIONS (email)")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS CLAIMS (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_lomba       TEXT    NOT NULL,
        tingkat          TEXT    NOT NULL,
        tanggal          TEXT    NOT NULL,
        peringkat        TEXT    NOT NULL,
        sertifikat_path  TEXT    NOT NULL,
        phash            TEXT    NOT NULL,
        status           TEXT    NOT NULL DEFAULT 'belum dicek',
        mahasiswa_email  TEXT    NOT NULL,
        nama_display     TEXT    NOT NULL,
        mirip_dengan_id  INTEGER,
        verified_by      INTEGER,
        verified_at      TEXT,
        FOREIGN KEY (verified_by) REFERENCES USERS (id)
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_email    ON CLAIMS (mahasiswa_email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_status   ON CLAIMS (status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_verified ON CLAIMS (verified_by)")

    cursor.execute("""
    CREATE TRIGGER IF NOT EXISTS trg_claims_status_check
    BEFORE INSERT ON CLAIMS
    BEGIN
        SELECT RAISE(ABORT, 'Status tidak valid.')
        WHERE NEW.status NOT IN ('belum dicek', 'perlu ditinjau', 'sudah dicek');
    END
    """)
    cursor.execute("""
    CREATE TRIGGER IF NOT EXISTS trg_claims_status_update_check
    BEFORE UPDATE OF status ON CLAIMS
    BEGIN
        SELECT RAISE(ABORT, 'Status tidak valid.')
        WHERE NEW.status NOT IN ('belum dicek', 'perlu ditinjau', 'sudah dicek');
    END
    """)
    cursor.execute("""
    CREATE TRIGGER IF NOT EXISTS trg_claims_verified_at
    AFTER UPDATE OF verified_by ON CLAIMS
    WHEN NEW.verified_by IS NOT NULL AND OLD.verified_by IS NULL
    BEGIN
        UPDATE CLAIMS SET verified_at = DATETIME('now', 'localtime') WHERE id = NEW.id;
    END
    """)

    cursor.execute("""
    INSERT OR IGNORE INTO USERS (username, password_hash, nama, email)
    VALUES (
        'admin',
        '$2b$12$placeholder_hash_ganti_dengan_bcrypt',
        'Administrator',
        'admin@campus.ac.id'
    )
    """)

    conn.commit()
    conn.close()

# ---------------------------------------------------------------------------
# Insert klaim baru + deteksi duplikat
# ---------------------------------------------------------------------------
def insert_claim(nama_lomba, tingkat, tanggal, peringkat, sertifikat_path,
                 mahasiswa_email="placeholder@students.ukdw.ac.id",
                 nama_display="Mahasiswa"):

    conn = _get_conn()
    cursor = conn.cursor()

    new_hash = generate_phash(sertifikat_path)

    # Bandingkan dengan semua klaim lama
    cursor.execute("SELECT id, nama_lomba, peringkat, phash FROM CLAIMS")
    rows = cursor.fetchall()

    flagged         = False
    mirip_dengan_id = None
    detail          = {}

    for row in rows:
        old_id, old_nama, old_peringkat, old_phash_str = row

        sim_nama = token_sort_ratio(nama_lomba, old_nama)
        print(f"[Tahap 1] vs ID {old_id}: similarity nama={sim_nama}%")

        old_hash = imagehash.hex_to_hash(old_phash_str)
        distance = int(hamming_distance(new_hash, old_hash))
        print(f"[Tahap 2] vs ID {old_id}: Hamming distance={distance}")

        if distance <= PHASH_THRESHOLD:
            if peringkat == old_peringkat:
                flagged         = True
                mirip_dengan_id = old_id
                detail          = {
                    "duplikat_dengan_id": old_id,
                    "similarity_nama":    sim_nama,
                    "distance_phash":     distance,
                }
                print(f"[FLAGGED] Mirip dengan ID {old_id}")
                break
            else:
                print(f"[Info] Mirip ID {old_id} tapi peringkat beda — tidak di-flag")

    status = "perlu ditinjau" if flagged else "belum dicek"

    cursor.execute("""
        INSERT INTO CLAIMS
            (nama_lomba, tingkat, tanggal, peringkat, sertifikat_path,
             phash, status, mahasiswa_email, nama_display, mirip_dengan_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        nama_lomba, tingkat, tanggal, peringkat, sertifikat_path,
        str(new_hash), status, mahasiswa_email, nama_display, mirip_dengan_id,
    ))

    conn.commit()
    conn.close()

    print(f"Klaim disimpan — status={status}")
    return {"uploaded": True, "flagged": flagged, **detail}

# ---------------------------------------------------------------------------
# Approve & Discard
# ---------------------------------------------------------------------------
def approve_claim(claim_id):
    conn = _get_conn()
    conn.execute("UPDATE CLAIMS SET status = 'sudah dicek' WHERE id = ?", (claim_id,))
    conn.commit()
    conn.close()

def discard_claim(claim_id):
    conn = _get_conn()
    conn.execute("DELETE FROM CLAIMS WHERE id = ?", (claim_id,))
    conn.commit()
    conn.close()

# ---------------------------------------------------------------------------
# Helper: row DB → dict
# ---------------------------------------------------------------------------
def _row_to_dict(row):
    return {
        "id":                  row[0],
        "nama_lomba":          row[1],
        "tingkat":             row[2],
        "tanggal":             row[3],
        "peringkat":           row[4],
        "sertifikat_filename": os.path.basename(row[5]),
        "status":              row[6],
        "mahasiswa_email":     row[7],
        "nama_display":        row[8],
        "mirip_dengan_id":     row[9],
        "verified_by":         row[10],
        "verified_at":         row[11],
    }

# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------
def get_all_claims():
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, nama_lomba, tingkat, tanggal, peringkat,
               sertifikat_path, status, mahasiswa_email, nama_display,
               mirip_dengan_id, verified_by, verified_at
        FROM CLAIMS ORDER BY id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_dict(row) for row in rows]

def get_claims_by_email(email):
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, nama_lomba, tingkat, tanggal, peringkat,
               sertifikat_path, status, mahasiswa_email, nama_display,
               mirip_dengan_id, verified_by, verified_at
        FROM CLAIMS WHERE mahasiswa_email = ? ORDER BY id DESC
    """, (email,))
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_dict(row) for row in rows]

def get_claim_by_id(claim_id):
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, nama_lomba, tingkat, tanggal, peringkat,
               sertifikat_path, status, mahasiswa_email, nama_display,
               mirip_dengan_id, verified_by, verified_at
        FROM CLAIMS WHERE id = ?
    """, (claim_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row) if row else None
