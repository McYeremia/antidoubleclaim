import sqlite3
import os
import bcrypt
from backend.image_hash import generate_phash, hamming_distance
from backend.text_similarity import token_sort_ratio
import imagehash
import json

PHASH_THRESHOLD  = 10   # Maximum Hamming distance agar dianggap mirip secara visual
FUZZY_THRESHOLD  = 80   # Minimum skor fuzzy nama lomba (0–100) agar dianggap mirip

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
        estimasi_reward         INTEGER,
        created_at              TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
        FOREIGN KEY (claim_id) REFERENCES CLAIMS (id)
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pengajuan_email ON PENGAJUAN (mahasiswa_email)")

    # Migrasi: tambah kolom baru ke tabel lama jika belum ada
    for migration in [
        "ALTER TABLE PENGAJUAN ADD COLUMN estimasi_reward INTEGER",
        "ALTER TABLE USERS ADD COLUMN role TEXT NOT NULL DEFAULT 'operator'",
        "ALTER TABLE CLAIMS ADD COLUMN flag_alasan TEXT",
        "ALTER TABLE CLAIMS ADD COLUMN periode_id INTEGER",
        "ALTER TABLE PENGAJUAN ADD COLUMN kompetisi_puspresnas TEXT",
    ]:
        try:
            cursor.execute(migration)
            conn.commit()
        except Exception:
            pass  # kolom sudah ada

    # Isi flag_alasan untuk klaim lama yang di-flag sebelum fitur ini ada
    # (klaim lama hanya terdeteksi via pHash, bukan fuzzy)
    try:
        cursor.execute("""
            UPDATE CLAIMS SET flag_alasan = 'gambar'
            WHERE mirip_dengan_id IS NOT NULL AND flag_alasan IS NULL
        """)
        conn.commit()
    except Exception:
        pass

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

    # Migrasi REWARD_KONFIRMASI: tambah periode_id (FK ke PERIODE_KLAIM) jika belum ada
    try:
        cursor.execute("ALTER TABLE REWARD_KONFIRMASI ADD COLUMN periode_id INTEGER")
        conn.commit()
    except Exception:
        pass  # kolom sudah ada

    # ── Tabel MAHASISWA_PROFIL ────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS MAHASISWA_PROFIL (
        email                  TEXT PRIMARY KEY,
        nomor_wa               TEXT,
        nama_pemilik_rekening  TEXT,
        nomor_rekening         TEXT,
        updated_at             TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
    )
    """)

    # ── Tabel PERIODE_KLAIM ───────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS PERIODE_KLAIM (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        nama            TEXT    NOT NULL,
        semester        INTEGER NOT NULL,
        tahun           INTEGER NOT NULL,
        tanggal_mulai   TEXT    NOT NULL,
        tanggal_selesai TEXT    NOT NULL,
        status          TEXT    NOT NULL DEFAULT 'tutup',
        dibuat_oleh     TEXT,
        dibuat_at       TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime'))
    )
    """)

    # Seed akun superadmin default jika belum ada
    cursor.execute("SELECT id FROM USERS WHERE username = 'admin'")
    if not cursor.fetchone():
        default_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
        cursor.execute(
            "INSERT INTO USERS (username, password_hash, nama, email, role) VALUES (?, ?, ?, ?, ?)",
            ("admin", default_hash, "Super Admin", "admin@campus.ac.id", "superadmin"),
        )
    else:
        # Pastikan admin lama memiliki role superadmin
        cursor.execute("UPDATE USERS SET role = 'superadmin' WHERE username = 'admin'")

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

        # Tahap 1 — Fuzzy nama lomba
        sim_nama   = token_sort_ratio(nama_lomba, old_nama)
        nama_mirip = sim_nama >= FUZZY_THRESHOLD
        print(f"[Tahap 1] vs ID {old_id}: similarity nama={sim_nama}% (threshold={FUZZY_THRESHOLD}) → {'MIRIP' if nama_mirip else 'aman'}")

        # Tahap 2 — pHash gambar sertifikat
        old_hash   = imagehash.hex_to_hash(old_phash_str)
        distance   = int(hamming_distance(new_hash, old_hash))
        phash_mirip = distance <= PHASH_THRESHOLD
        print(f"[Tahap 2] vs ID {old_id}: Hamming distance={distance} (threshold={PHASH_THRESHOLD}) → {'MIRIP' if phash_mirip else 'aman'}")

        # Tahap 3 — Jika salah satu atau keduanya mirip, cek peringkat
        if phash_mirip or nama_mirip:
            alasan = []
            if phash_mirip: alasan.append("gambar")
            if nama_mirip:  alasan.append("nama lomba")
            print(f"[Tahap 3] vs ID {old_id}: kemiripan terdeteksi ({', '.join(alasan)}) — cek peringkat...")

            if peringkat == old_peringkat:
                flagged         = True
                mirip_dengan_id = old_id
                detail          = {
                    "duplikat_dengan_id": old_id,
                    "similarity_nama":    sim_nama,
                    "distance_phash":     distance,
                    "flag_alasan":        ", ".join(alasan),
                }
                print(f"[FLAGGED] Mirip dengan ID {old_id} — alasan: {', '.join(alasan)}, peringkat sama ({peringkat})")
                break
            else:
                print(f"[Info] vs ID {old_id}: kemiripan terdeteksi tapi peringkat berbeda ({peringkat} vs {old_peringkat}) — tidak di-flag")

    status = "perlu ditinjau" if flagged else "belum dicek"

    flag_alasan = detail.get("flag_alasan") if flagged else None

    # Ambil periode aktif untuk dicatat pada klaim
    cursor.execute("""
        SELECT id FROM PERIODE_KLAIM
        WHERE status = 'aktif'
          AND DATE('now', 'localtime') BETWEEN tanggal_mulai AND tanggal_selesai
        ORDER BY id DESC LIMIT 1
    """)
    periode_row = cursor.fetchone()
    periode_id  = periode_row[0] if periode_row else None

    cursor.execute("""
        INSERT INTO CLAIMS
            (nama_lomba, tingkat, tanggal, peringkat, sertifikat_path,
             phash, status, mahasiswa_email, nama_display, mirip_dengan_id, flag_alasan, periode_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        nama_lomba, tingkat, tanggal, peringkat, sertifikat_path,
        str(new_hash), status, mahasiswa_email, nama_display, mirip_dengan_id, flag_alasan, periode_id,
    ))

    claim_id = cursor.lastrowid
    conn.commit()
    conn.close()

    print(f"Klaim disimpan — id={claim_id}, status={status}")
    return {"uploaded": True, "flagged": flagged, "id": claim_id, **detail}

# ---------------------------------------------------------------------------
# Approve & Discard
# ---------------------------------------------------------------------------
def approve_claim(claim_id, operator_id=None):
    conn = _get_conn()
    if operator_id:
        conn.execute(
            "UPDATE CLAIMS SET status = 'sudah dicek', verified_by = ? WHERE id = ?",
            (operator_id, claim_id)
        )
    else:
        conn.execute("UPDATE CLAIMS SET status = 'sudah dicek' WHERE id = ?", (claim_id,))
    conn.commit()
    conn.close()

def discard_claim(claim_id):
    conn = _get_conn()
    # Hapus child records terlebih dahulu sesuai urutan FK:
    # 1. PENGAJUAN_ANGGOTA → 2. PENGAJUAN → 3. REWARD_KONFIRMASI → 4. CLAIMS
    pengajuan_ids = [
        row[0] for row in
        conn.execute("SELECT id FROM PENGAJUAN WHERE claim_id = ?", (claim_id,)).fetchall()
    ]
    if pengajuan_ids:
        placeholders = ",".join("?" * len(pengajuan_ids))
        conn.execute(f"DELETE FROM PENGAJUAN_ANGGOTA WHERE pengajuan_id IN ({placeholders})", pengajuan_ids)
    conn.execute("DELETE FROM PENGAJUAN WHERE claim_id = ?", (claim_id,))
    conn.execute("DELETE FROM REWARD_KONFIRMASI WHERE claim_id = ?", (claim_id,))
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
        "verified_by_nama":    row[12] if len(row) > 12 else None,
        "flag_alasan":         row[13] if len(row) > 13 else None,
    }

# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------
def get_all_claims():
    """Kembalikan semua klaim KECUALI yang berasal dari periode diarsipkan."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id, c.nama_lomba, c.tingkat, c.tanggal, c.peringkat,
               c.sertifikat_path, c.status, c.mahasiswa_email, c.nama_display,
               c.mirip_dengan_id, c.verified_by, c.verified_at,
               u.nama AS verified_by_nama, c.flag_alasan
        FROM CLAIMS c
        LEFT JOIN USERS u ON u.id = c.verified_by
        LEFT JOIN PERIODE_KLAIM pk ON pk.id = c.periode_id
        WHERE (pk.status IS NULL OR pk.status != 'diarsipkan')
        ORDER BY c.id DESC
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
            claim_id, setuju, estimasi_reward, kompetisi_puspresnas
        ) VALUES (
            ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
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
        data.get("estimasi_reward"), data.get("kompetisi_puspresnas"),
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


def update_pengajuan(pengajuan_id: int, data: dict):
    # Kolom yang boleh diedit oleh operator
    EDITABLE = [
        "nama_display", "nomor_wa", "ada_dospem", "nidn_dospem",
        "kategori_simkatmawa", "jenis_kepesertaan", "nama_kegiatan",
        "kategori_kegiatan", "tingkatan", "tahun_kegiatan", "model_pelaksanaan",
        "jumlah_peserta", "capaian", "tanggal_mulai", "tanggal_selesai",
        "url_penyelenggara", "keterangan",
        "nama_lembaga", "jenis_karya_teks", "jenis_karya_pilihan",
        "deskripsi_karya", "manfaat_karya", "nomor_surat", "tanggal_surat",
        "nama_ketua", "peran_pengeclaim", "keterangan_kelompok",
        "estimasi_reward", "kompetisi_puspresnas",
    ]
    sets   = [f"{col} = ?" for col in EDITABLE if col in data]
    values = [data[col]    for col in EDITABLE if col in data]
    if not sets:
        return
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute(
        f"UPDATE PENGAJUAN SET {', '.join(sets)} WHERE id = ?",
        (*values, pengajuan_id),
    )

    # Sync field terkait ke tabel CLAIMS
    cursor.execute("SELECT claim_id, nama_kegiatan, kategori_kegiatan, tingkatan, capaian, tanggal_mulai, tahun_kegiatan FROM PENGAJUAN WHERE id = ?", (pengajuan_id,))
    row = cursor.fetchone()
    if row:
        claim_id, nama_kegiatan, kategori_kegiatan, tingkatan, capaian, tanggal_mulai, tahun_kegiatan = row
        tingkat_baru  = kategori_kegiatan or tingkatan
        tanggal_baru  = tanggal_mulai or tahun_kegiatan
        claim_updates = {}
        if nama_kegiatan: claim_updates["nama_lomba"] = nama_kegiatan
        if tingkat_baru:  claim_updates["tingkat"]    = tingkat_baru
        if capaian:       claim_updates["peringkat"]  = capaian
        if tanggal_baru:  claim_updates["tanggal"]    = tanggal_baru
        if claim_updates and claim_id:
            c_sets   = [f"{k} = ?" for k in claim_updates]
            c_values = list(claim_updates.values())
            cursor.execute(f"UPDATE CLAIMS SET {', '.join(c_sets)} WHERE id = ?", (*c_values, claim_id))

    conn.commit()
    conn.close()


def get_claims_by_email(email):
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id, c.nama_lomba, c.tingkat, c.tanggal, c.peringkat,
               c.sertifikat_path, c.status, c.mahasiswa_email, c.nama_display,
               c.mirip_dengan_id, c.verified_by, c.verified_at,
               u.nama AS verified_by_nama, c.flag_alasan
        FROM CLAIMS c
        LEFT JOIN USERS u ON u.id = c.verified_by
        WHERE c.mahasiswa_email = ? ORDER BY c.id DESC
    """, (email,))
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_dict(row) for row in rows]

def get_claim_by_id(claim_id):
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id, c.nama_lomba, c.tingkat, c.tanggal, c.peringkat,
               c.sertifikat_path, c.status, c.mahasiswa_email, c.nama_display,
               c.mirip_dengan_id, c.verified_by, c.verified_at,
               u.nama AS verified_by_nama, c.flag_alasan
        FROM CLAIMS c
        LEFT JOIN USERS u ON u.id = c.verified_by
        WHERE c.id = ?
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
            claim_id, mahasiswa_email, tahun_klaim, periode, periode_id,
            nomor_urut_lampiran, kategori_lomba, kompetisi_puspresnas, judul_lomba,
            tahun_kegiatan, nama_ketua, nim, nomor_wa, nama_pemilik_rekening, bank,
            nomor_rekening, foto_buku_tabungan_path, foto_ktm_path, foto_ktp_path,
            pakta_integritas_path, laporan_akhir_path, karya_publikasi_path,
            bersedia, data_benar
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        data.get("claim_id"),            data.get("mahasiswa_email"),
        data.get("tahun_klaim"),         data.get("periode"),
        data.get("periode_id"),
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


def update_reward_konfirmasi(reward_id: int, data: dict):
    """Update data form reward + reset status ke 'menunggu' untuk pengiriman ulang."""
    # periode dan periode_id TIDAK diupdate — dicatat sekali saat pertama submit, immutable
    TEXT_FIELDS = [
        "tahun_klaim", "nomor_urut_lampiran", "kategori_lomba",
        "kompetisi_puspresnas", "judul_lomba", "tahun_kegiatan",
        "nama_ketua", "nomor_wa", "nama_pemilik_rekening", "bank", "nomor_rekening",
    ]
    FILE_FIELDS = [
        "foto_buku_tabungan_path", "foto_ktm_path", "foto_ktp_path",
        "pakta_integritas_path", "laporan_akhir_path", "karya_publikasi_path",
    ]

    sets, values = [], []

    for col in TEXT_FIELDS:
        if col in data and data[col] is not None:
            sets.append(f"{col} = ?")
            values.append(data[col])

    for col in FILE_FIELDS:
        if col in data and data[col]:          # hanya update jika ada file baru
            sets.append(f"{col} = ?")
            values.append(data[col])

    if "bersedia" in data:
        sets.append("bersedia = ?")
        values.append(1 if data["bersedia"] else 0)
    if "data_benar" in data:
        sets.append("data_benar = ?")
        values.append(1 if data["data_benar"] else 0)

    # Selalu reset status dan hapus catatan operator
    sets += ["reward_status = ?", "catatan_operator = ?"]
    values += ["menunggu", None]

    if not sets:
        return

    conn = _get_conn()
    conn.execute(
        f"UPDATE REWARD_KONFIRMASI SET {', '.join(sets)} WHERE id = ?",
        (*values, reward_id)
    )
    conn.commit()
    conn.close()


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


# ---------------------------------------------------------------------------
# Autentikasi Operator
# ---------------------------------------------------------------------------
def get_all_operators() -> list:
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, nama, email, role FROM USERS ORDER BY id")
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    return [dict(zip(cols, row)) for row in rows]


def get_operator_by_id(operator_id: int):
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, username, nama, email, role FROM USERS WHERE id = ?",
        (operator_id,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    cols = ["id", "username", "nama", "email", "role"]
    return dict(zip(cols, row))


def authenticate_operator(username: str, password: str):
    """Verifikasi username + password. Kembalikan dict user jika valid, None jika tidak."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, username, password_hash, nama, email, role FROM USERS WHERE username = ?",
        (username,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    uid, uname, pw_hash, nama, email, role = row
    try:
        ok = bcrypt.checkpw(password.encode(), pw_hash.encode())
    except Exception:
        ok = False
    if not ok:
        return None
    return {"id": uid, "username": uname, "nama": nama, "email": email, "role": role}


def create_operator(username: str, password: str, nama: str, email: str, role: str = "operator"):
    """Buat akun operator baru. role: 'operator' atau 'superadmin'."""
    if role not in ("operator", "superadmin"):
        return False
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO USERS (username, password_hash, nama, email, role) VALUES (?, ?, ?, ?, ?)",
            (username, pw_hash, nama, email, role)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Profil Mahasiswa
# ---------------------------------------------------------------------------
def get_profil_mahasiswa(email: str):
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM MAHASISWA_PROFIL WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return {}
    cols = [d[0] for d in cursor.description]
    return dict(zip(cols, row))


def upsert_profil_mahasiswa(email: str, data: dict):
    conn = _get_conn()
    conn.execute("""
        INSERT INTO MAHASISWA_PROFIL (email, nomor_wa, nama_pemilik_rekening, nomor_rekening, updated_at)
        VALUES (?, ?, ?, ?, DATETIME('now', 'localtime'))
        ON CONFLICT(email) DO UPDATE SET
            nomor_wa              = excluded.nomor_wa,
            nama_pemilik_rekening = excluded.nama_pemilik_rekening,
            nomor_rekening        = excluded.nomor_rekening,
            updated_at            = DATETIME('now', 'localtime')
    """, (
        email,
        data.get("nomor_wa"),
        data.get("nama_pemilik_rekening"),
        data.get("nomor_rekening"),
    ))
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Statistik Visualisasi
# ---------------------------------------------------------------------------
def get_stats_visualisasi() -> dict:
    """
    Mengembalikan statistik klaim berdasarkan:
    - by_fakultas  : dari kode NIM di email mahasiswa
    - by_prodi     : dari kode NIM di email mahasiswa
    - by_jenis     : dari kategori_simkatmawa di PENGAJUAN
    - by_tahun     : dari tahun_kegiatan di PENGAJUAN (fallback: tahun tanggal CLAIMS)
    """
    from backend.nim_parser import parse_nim, FAKULTAS, PRODI

    conn = _get_conn()
    cursor = conn.cursor()

    # Ambil semua klaim (hanya yang sudah diproses/disetujui)
    cursor.execute("""
        SELECT c.mahasiswa_email, c.tanggal,
               p.kategori_simkatmawa, p.tahun_kegiatan
        FROM CLAIMS c
        LEFT JOIN PENGAJUAN p ON p.claim_id = c.id
        ORDER BY c.id
    """)
    rows = cursor.fetchall()
    conn.close()

    from collections import defaultdict
    fakultas_count = defaultdict(int)
    prodi_count    = defaultdict(int)
    jenis_count    = defaultdict(int)
    tahun_count    = defaultdict(int)

    for (email, tanggal, kategori, tahun_kegiatan) in rows:
        # Fakultas & Prodi dari NIM
        parsed = parse_nim(email)
        if parsed.get("valid"):
            fak  = parsed["fakultas"]
            prod = parsed["prodi"]
        else:
            fak  = "Lainnya"
            prod = "Lainnya"
        fakultas_count[fak]  += 1
        prodi_count[prod]    += 1

        # Jenis kegiatan
        if kategori == "lomba_mandiri":
            jenis_count["Lomba Mandiri"] += 1
        elif kategori == "rekognisi_non_lomba":
            jenis_count["Rekognisi Non-Lomba"] += 1
        else:
            jenis_count["Tidak Diketahui"] += 1

        # Tahun kegiatan (pakai tahun_kegiatan dari pengajuan, fallback ke tahun tanggal klaim)
        tahun = tahun_kegiatan or (tanggal[:4] if tanggal and len(tanggal) >= 4 else "—")
        tahun_count[tahun] += 1

    def to_list(d):
        return sorted(
            [{"name": k, "count": v} for k, v in d.items()],
            key=lambda x: -x["count"]
        )

    def to_list_sorted_key(d):
        return sorted(
            [{"name": k, "count": v} for k, v in d.items()],
            key=lambda x: x["name"]
        )

    return {
        "total":        sum(v for v in tahun_count.values()),
        "by_fakultas":  to_list(fakultas_count),
        "by_prodi":     to_list(prodi_count),
        "by_jenis":     to_list(jenis_count),
        "by_tahun":     to_list_sorted_key(tahun_count),
    }


# ---------------------------------------------------------------------------
# Periode Klaim
# ---------------------------------------------------------------------------
def get_periode_terkini():
    """
    Kembalikan periode berdasarkan rentang tanggal (tidak peduli status aktif/tutup).
    Prioritas: periode yang rentang tanggalnya mencakup hari ini.
    Fallback: periode terakhir yang sudah lewat (paling baru).
    """
    conn = _get_conn()
    cursor = conn.cursor()
    # Periode yang tanggalnya mencakup hari ini (bisa aktif atau tutup)
    cursor.execute("""
        SELECT * FROM PERIODE_KLAIM
        WHERE DATE('now', 'localtime') BETWEEN tanggal_mulai AND tanggal_selesai
        ORDER BY id DESC
        LIMIT 1
    """)
    row = cursor.fetchone()
    if not row:
        # Fallback: periode terakhir yang sudah berakhir
        cursor.execute("""
            SELECT * FROM PERIODE_KLAIM
            ORDER BY tanggal_selesai DESC
            LIMIT 1
        """)
        row = cursor.fetchone()
    cols = [d[0] for d in cursor.description] if row else []
    conn.close()
    return dict(zip(cols, row)) if row else None


def get_periode_aktif():
    """Kembalikan periode yang sedang aktif (status='aktif' dan hari ini dalam rentang tanggal)."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM PERIODE_KLAIM
        WHERE status = 'aktif'
          AND DATE('now', 'localtime') BETWEEN tanggal_mulai AND tanggal_selesai
        ORDER BY id DESC
        LIMIT 1
    """)
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    cols = [d[0] for d in cursor.description]
    return dict(zip(cols, row))


def get_all_periode():
    """Kembalikan semua periode, terbaru di atas. Sertakan jumlah klaim per periode."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.*,
               COUNT(c.id)                                          AS jumlah_klaim,
               SUM(CASE WHEN c.status = 'sudah dicek' THEN 1 ELSE 0 END) AS klaim_disetujui,
               SUM(CASE WHEN c.status IN ('belum dicek', 'perlu ditinjau') THEN 1 ELSE 0 END) AS klaim_pending,
               SUM(CASE WHEN rk.reward_status = 'selesai' THEN 1 ELSE 0 END) AS reward_selesai,
               SUM(CASE WHEN rk.id IS NOT NULL AND rk.reward_status != 'selesai' THEN 1 ELSE 0 END) AS reward_pending
        FROM PERIODE_KLAIM p
        LEFT JOIN CLAIMS c ON c.periode_id = p.id
        LEFT JOIN REWARD_KONFIRMASI rk ON rk.claim_id = c.id
        GROUP BY p.id
        ORDER BY p.id DESC
    """)
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    return [dict(zip(cols, row)) for row in rows]


def create_periode(data: dict) -> int:
    """Buat periode baru dengan status 'tutup' (harus diaktifkan manual)."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO PERIODE_KLAIM (nama, semester, tahun, tanggal_mulai, tanggal_selesai, status, dibuat_oleh)
        VALUES (?, ?, ?, ?, ?, 'tutup', ?)
    """, (
        data.get("nama"),
        data.get("semester"),
        data.get("tahun"),
        data.get("tanggal_mulai"),
        data.get("tanggal_selesai"),
        data.get("dibuat_oleh"),
    ))
    periode_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return periode_id


def update_periode_status(periode_id: int, status: str) -> bool:
    """Ubah status periode: 'aktif', 'tutup', atau 'ditutup'. Hanya 1 periode aktif sekaligus."""
    if status not in ("aktif", "tutup", "ditutup"):
        return False
    conn = _get_conn()
    if status == "aktif":
        conn.execute("UPDATE PERIODE_KLAIM SET status = 'tutup' WHERE status = 'aktif'")
    conn.execute("UPDATE PERIODE_KLAIM SET status = ? WHERE id = ?", (status, periode_id))
    conn.commit()
    conn.close()
    return True


def arsipkan_periode(periode_id: int) -> dict:
    """
    Arsipkan periode: ubah status menjadi 'diarsipkan'.
    Hanya berhasil jika semua reward pada periode tsb sudah selesai.
    Kembalikan {"ok": True} atau {"ok": False, "alasan": str, "pending": int}.
    """
    conn = _get_conn()
    cursor = conn.cursor()

    # Cek status periode
    cursor.execute("SELECT status FROM PERIODE_KLAIM WHERE id = ?", (periode_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"ok": False, "alasan": "Periode tidak ditemukan"}
    if row[0] not in ("tutup", "ditutup"):
        conn.close()
        return {"ok": False, "alasan": "Hanya periode yang sudah ditutup yang dapat diarsipkan"}

    # Cek klaim yang belum diverifikasi pada periode ini
    cursor.execute("""
        SELECT COUNT(*) FROM CLAIMS
        WHERE periode_id = ? AND status IN ('belum dicek', 'perlu ditinjau')
    """, (periode_id,))
    klaim_pending = cursor.fetchone()[0]

    if klaim_pending > 0:
        conn.close()
        return {
            "ok": False,
            "alasan": f"Masih ada {klaim_pending} klaim yang belum diverifikasi (belum dicek / perlu ditinjau)",
            "klaim_pending": klaim_pending,
        }

    # Hitung reward yang belum selesai pada periode ini
    cursor.execute("""
        SELECT COUNT(*) FROM REWARD_KONFIRMASI rk
        JOIN CLAIMS c ON c.id = rk.claim_id
        WHERE c.periode_id = ? AND rk.reward_status != 'selesai'
    """, (periode_id,))
    reward_pending = cursor.fetchone()[0]

    if reward_pending > 0:
        conn.close()
        return {
            "ok": False,
            "alasan": f"Masih ada {reward_pending} reward yang belum selesai (dana belum terkirim)",
            "reward_pending": reward_pending,
        }

    conn.execute("UPDATE PERIODE_KLAIM SET status = 'diarsipkan' WHERE id = ?", (periode_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


def get_claims_by_periode_id(periode_id: int) -> list:
    """Ambil semua klaim yang terdaftar pada periode tertentu."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id, c.nama_lomba, c.tingkat, c.tanggal, c.peringkat,
               c.sertifikat_path, c.status, c.mahasiswa_email, c.nama_display,
               c.mirip_dengan_id, c.verified_by, c.verified_at,
               u.nama AS verified_by_nama, c.flag_alasan
        FROM CLAIMS c
        LEFT JOIN USERS u ON u.id = c.verified_by
        WHERE c.periode_id = ?
        ORDER BY c.id DESC
    """, (periode_id,))
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_dict(row) for row in rows]


def get_rewards_by_periode_id(periode_id: int) -> list:
    """Ambil semua reward konfirmasi pada periode tertentu (via claim.periode_id)."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT rk.*, c.nama_lomba, p.estimasi_reward, p.kompetisi_puspresnas
        FROM REWARD_KONFIRMASI rk
        JOIN CLAIMS c ON c.id = rk.claim_id
        LEFT JOIN PENGAJUAN p ON p.claim_id = rk.claim_id
        WHERE c.periode_id = ?
        ORDER BY rk.id DESC
    """, (periode_id,))
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    return [dict(zip(cols, row)) for row in rows]


def update_periode_data(periode_id: int, data: dict) -> bool:
    """Edit nama, tanggal_mulai, tanggal_selesai periode."""
    conn = _get_conn()
    conn.execute(
        "UPDATE PERIODE_KLAIM SET nama = ?, tanggal_mulai = ?, tanggal_selesai = ? WHERE id = ?",
        (data.get("nama"), data.get("tanggal_mulai"), data.get("tanggal_selesai"), periode_id)
    )
    conn.commit()
    conn.close()
    return True


def delete_periode(periode_id: int) -> bool:
    """Hapus periode. Tidak bisa hapus periode yang sedang aktif."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM PERIODE_KLAIM WHERE id = ?", (periode_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    if row[0] == "aktif":
        conn.close()
        return False  # tidak boleh hapus periode yang sedang aktif
    conn.execute("DELETE FROM PERIODE_KLAIM WHERE id = ?", (periode_id,))
    conn.commit()
    conn.close()
    return True


def reset_semua_data() -> None:
    """Hapus semua data kecuali tabel USERS."""
    conn = _get_conn()
    # Urutan sesuai FK: child dulu baru parent
    conn.execute("DELETE FROM REWARD_KONFIRMASI")
    conn.execute("DELETE FROM PENGAJUAN_ANGGOTA")
    conn.execute("DELETE FROM PENGAJUAN")
    conn.execute("DELETE FROM CLAIMS")
    conn.execute("DELETE FROM MAHASISWA_PROFIL")
    conn.execute("DELETE FROM PERIODE_KLAIM")
    conn.execute("DELETE FROM OTP_SESSIONS")
    conn.commit()
    conn.close()


def delete_operator(operator_id: int) -> bool:
    """Hapus akun operator. Tidak bisa hapus superadmin terakhir."""
    conn = _get_conn()
    cursor = conn.cursor()
    # Cek apakah ini superadmin terakhir
    cursor.execute("SELECT role FROM USERS WHERE id = ?", (operator_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    if row[0] == "superadmin":
        cursor.execute("SELECT COUNT(*) FROM USERS WHERE role = 'superadmin'")
        count = cursor.fetchone()[0]
        if count <= 1:
            conn.close()
            return False  # tidak boleh hapus superadmin terakhir
    conn.execute("DELETE FROM USERS WHERE id = ?", (operator_id,))
    conn.commit()
    conn.close()
    return True


def update_operator_password(username: str, new_password: str):
    """Ganti password operator."""
    pw_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    conn = _get_conn()
    conn.execute(
        "UPDATE USERS SET password_hash = ? WHERE username = ?",
        (pw_hash, username)
    )
    conn.commit()
    conn.close()
