import sqlite3
import os
from backend.image_hash import generate_phash, hamming_distance
from backend.text_similarity import token_sort_ratio
import imagehash
import json

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

    # ── Tabel PENGAJUAN ───────────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS PENGAJUAN (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        mahasiswa_email         TEXT    NOT NULL,
        nama_display            TEXT    NOT NULL,
        nomor_wa                TEXT,
        ada_dospem              TEXT    NOT NULL DEFAULT 'tidak',
        nidn_dospem             TEXT,
        surat_tugas_path        TEXT,
        kategori_simkatmawa     TEXT    NOT NULL,
        jenis_kepesertaan       TEXT    NOT NULL,
        nama_kegiatan           TEXT    NOT NULL,
        kategori_kegiatan       TEXT,
        tingkatan               TEXT,
        tahun_kegiatan          TEXT,
        model_pelaksanaan       TEXT,
        jumlah_peserta          INTEGER,
        capaian                 TEXT,
        tanggal_mulai           TEXT,
        tanggal_selesai         TEXT,
        url_penyelenggara       TEXT,
        keterangan              TEXT,
        dokumen_sertifikat_path TEXT,
        foto_penyerahan_path    TEXT,
        dokumen_lainnya_path    TEXT,
        nama_lembaga            TEXT,
        jenis_karya_teks        TEXT,
        jenis_karya_pilihan     TEXT,
        deskripsi_karya         TEXT,
        manfaat_karya           TEXT,
        nomor_surat             TEXT,
        tanggal_surat           TEXT,
        nama_ketua              TEXT,
        peran_pengeclaim        TEXT,
        keterangan_kelompok     TEXT,
        claim_id                INTEGER,
        setuju                  INTEGER NOT NULL DEFAULT 0,
        created_at              TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
        FOREIGN KEY (claim_id) REFERENCES CLAIMS (id)
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pengajuan_email ON PENGAJUAN (mahasiswa_email)")

    # ── Tabel PENGAJUAN_ANGGOTA ───────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS PENGAJUAN_ANGGOTA (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        pengajuan_id    INTEGER NOT NULL,
        nama_anggota    TEXT    NOT NULL,
        nim_anggota     TEXT    NOT NULL,
        FOREIGN KEY (pengajuan_id) REFERENCES PENGAJUAN (id)
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_anggota_pengajuan ON PENGAJUAN_ANGGOTA (pengajuan_id)")

    # ── Tabel REWARD_KONFIRMASI ───────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS REWARD_KONFIRMASI (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        claim_id                INTEGER NOT NULL UNIQUE,
        mahasiswa_email         TEXT    NOT NULL,
        tahun_klaim             TEXT    NOT NULL,
        periode                 TEXT    NOT NULL,
        nomor_urut_lampiran     TEXT    NOT NULL,
        kategori_lomba          TEXT    NOT NULL,
        kompetisi_puspresnas    TEXT,
        judul_lomba             TEXT,
        tahun_kegiatan          TEXT,
        nama_ketua              TEXT    NOT NULL,
        nim                     TEXT    NOT NULL,
        nomor_wa                TEXT    NOT NULL,
        nama_pemilik_rekening   TEXT    NOT NULL,
        bank                    TEXT    NOT NULL DEFAULT 'BNI',
        nomor_rekening          TEXT,
        foto_buku_tabungan_path TEXT,
        foto_ktm_path           TEXT,
        foto_ktp_path           TEXT,
        pakta_integritas_path   TEXT,
        laporan_akhir_path      TEXT,
        karya_publikasi_path    TEXT,
        bersedia                INTEGER NOT NULL DEFAULT 0,
        data_benar              INTEGER NOT NULL DEFAULT 0,
        reward_status           TEXT    NOT NULL DEFAULT 'menunggu',
        catatan_operator        TEXT,
        created_at              TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
        FOREIGN KEY (claim_id) REFERENCES CLAIMS (id)
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reward_claim  ON REWARD_KONFIRMASI (claim_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reward_status ON REWARD_KONFIRMASI (reward_status)")

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

    claim_id = cursor.lastrowid
    conn.commit()
    conn.close()

    print(f"Klaim disimpan — id={claim_id}, status={status}")
    return {"uploaded": True, "flagged": flagged, "id": claim_id, **detail}

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

def insert_pengajuan(data: dict, anggota: list = None) -> int:
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO PENGAJUAN (
            mahasiswa_email, nama_display, nomor_wa,
            ada_dospem, nidn_dospem, surat_tugas_path,
            kategori_simkatmawa, jenis_kepesertaan,
            nama_kegiatan, kategori_kegiatan, tingkatan,
            tahun_kegiatan, model_pelaksanaan, jumlah_peserta,
            capaian, tanggal_mulai, tanggal_selesai,
            url_penyelenggara, keterangan,
            dokumen_sertifikat_path, foto_penyerahan_path, dokumen_lainnya_path,
            nama_lembaga, jenis_karya_teks, jenis_karya_pilihan,
            deskripsi_karya, manfaat_karya, nomor_surat, tanggal_surat,
            nama_ketua, peran_pengeclaim, keterangan_kelompok,
            claim_id, setuju
        ) VALUES (
            ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
        )
    """, (
        data.get("mahasiswa_email"), data.get("nama_display"), data.get("nomor_wa"),
        data.get("ada_dospem", "tidak"), data.get("nidn_dospem"), data.get("surat_tugas_path"),
        data.get("kategori_simkatmawa"), data.get("jenis_kepesertaan"),
        data.get("nama_kegiatan"), data.get("kategori_kegiatan"), data.get("tingkatan"),
        data.get("tahun_kegiatan"), data.get("model_pelaksanaan"), data.get("jumlah_peserta"),
        data.get("capaian"), data.get("tanggal_mulai"), data.get("tanggal_selesai"),
        data.get("url_penyelenggara"), data.get("keterangan"),
        data.get("dokumen_sertifikat_path"), data.get("foto_penyerahan_path"), data.get("dokumen_lainnya_path"),
        data.get("nama_lembaga"), data.get("jenis_karya_teks"), data.get("jenis_karya_pilihan"),
        data.get("deskripsi_karya"), data.get("manfaat_karya"), data.get("nomor_surat"), data.get("tanggal_surat"),
        data.get("nama_ketua"), data.get("peran_pengeclaim"), data.get("keterangan_kelompok"),
        data.get("claim_id"), 1 if data.get("setuju") else 0,
    ))
    pengajuan_id = cursor.lastrowid

    if anggota:
        for a in anggota:
            cursor.execute(
                "INSERT INTO PENGAJUAN_ANGGOTA (pengajuan_id, nama_anggota, nim_anggota) VALUES (?,?,?)",
                (pengajuan_id, a.get("nama", ""), a.get("nim", "")),
            )

    conn.commit()
    conn.close()
    return pengajuan_id


def get_pengajuan_by_email(email: str) -> list:
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.*, GROUP_CONCAT(a.nama_anggota || '|' || a.nim_anggota, ';;') AS anggota_list
        FROM PENGAJUAN p
        LEFT JOIN PENGAJUAN_ANGGOTA a ON a.pengajuan_id = p.id
        WHERE p.mahasiswa_email = ?
        GROUP BY p.id
        ORDER BY p.id DESC
    """, (email,))
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    return [dict(zip(cols, row)) for row in rows]


def get_pengajuan_by_claim_id(claim_id: int):
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.*, GROUP_CONCAT(a.nama_anggota || '|' || a.nim_anggota, ';;') AS anggota_list
        FROM PENGAJUAN p
        LEFT JOIN PENGAJUAN_ANGGOTA a ON a.pengajuan_id = p.id
        WHERE p.claim_id = ?
        GROUP BY p.id
    """, (claim_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    cols = [d[0] for d in cursor.description]
    conn.close()
    return dict(zip(cols, row))


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

# ---------------------------------------------------------------------------
# Reward Konfirmasi
# ---------------------------------------------------------------------------
def insert_reward_konfirmasi(data: dict) -> int:
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO REWARD_KONFIRMASI (
            claim_id, mahasiswa_email, tahun_klaim, periode, nomor_urut_lampiran,
            kategori_lomba, kompetisi_puspresnas, judul_lomba, tahun_kegiatan,
            nama_ketua, nim, nomor_wa, nama_pemilik_rekening, bank, nomor_rekening,
            foto_buku_tabungan_path, foto_ktm_path, foto_ktp_path,
            pakta_integritas_path, laporan_akhir_path, karya_publikasi_path,
            bersedia, data_benar
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        data.get("claim_id"),            data.get("mahasiswa_email"),
        data.get("tahun_klaim"),         data.get("periode"),
        data.get("nomor_urut_lampiran"), data.get("kategori_lomba"),
        data.get("kompetisi_puspresnas"),data.get("judul_lomba"),
        data.get("tahun_kegiatan"),      data.get("nama_ketua"),
        data.get("nim"),                 data.get("nomor_wa"),
        data.get("nama_pemilik_rekening"), data.get("bank", "BNI"),
        data.get("nomor_rekening"),
        data.get("foto_buku_tabungan_path"), data.get("foto_ktm_path"),
        data.get("foto_ktp_path"),       data.get("pakta_integritas_path"),
        data.get("laporan_akhir_path"),  data.get("karya_publikasi_path"),
        1 if data.get("bersedia")   else 0,
        1 if data.get("data_benar") else 0,
    ))
    reward_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return reward_id


def get_reward_konfirmasi_by_claim_id(claim_id: int):
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM REWARD_KONFIRMASI WHERE claim_id = ?", (claim_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    cols = [d[0] for d in cursor.description]
    conn.close()
    return dict(zip(cols, row))


def get_reward_konfirmasi_by_email(email: str) -> list:
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM REWARD_KONFIRMASI WHERE mahasiswa_email = ? ORDER BY id DESC",
        (email,)
    )
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    return [dict(zip(cols, row)) for row in rows]


def update_reward_status(reward_id: int, status: str, catatan: str = None):
    conn = _get_conn()
    if catatan is not None:
        conn.execute(
            "UPDATE REWARD_KONFIRMASI SET reward_status = ?, catatan_operator = ? WHERE id = ?",
            (status, catatan, reward_id)
        )
    else:
        conn.execute(
            "UPDATE REWARD_KONFIRMASI SET reward_status = ? WHERE id = ?",
            (status, reward_id)
        )
    conn.commit()
    conn.close()
