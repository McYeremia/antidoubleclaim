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
def _fmt_datetime(value: str) -> str:
    """Ubah ISO datetime dari SQLite menjadi format Indonesia, e.g. '3 Mei 2026, 14:30'."""
    if not value:
        return ""
    from datetime import datetime
    _BULAN = ["Januari","Februari","Maret","April","Mei","Juni",
              "Juli","Agustus","September","Oktober","November","Desember"]
    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S.%f",
                "%Y-%m-%d %H:%M:%S",    "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d"):
        try:
            dt = datetime.strptime(value, fmt)
            base = f"{dt.day} {_BULAN[dt.month - 1]} {dt.year}"
            if fmt != "%Y-%m-%d":
                base += f", {dt.strftime('%H:%M')}"
            return base
        except ValueError:
            continue
    return value


def _get_conn():
    conn = sqlite3.connect("claims.db", timeout=10)
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

    try:
        cursor.execute("ALTER TABLE CLAIMS ADD COLUMN catatan_penolakan TEXT")
    except Exception:
        pass

    cursor.execute("DROP TRIGGER IF EXISTS trg_claims_status_check")
    cursor.execute("DROP TRIGGER IF EXISTS trg_claims_status_update_check")
    cursor.execute("""
    CREATE TRIGGER IF NOT EXISTS trg_claims_status_check
    BEFORE INSERT ON CLAIMS
    BEGIN
        SELECT RAISE(ABORT, 'Status tidak valid.')
        WHERE NEW.status NOT IN ('belum dicek', 'perlu ditinjau', 'sudah dicek', 'ditolak');
    END
    """)
    cursor.execute("""
    CREATE TRIGGER IF NOT EXISTS trg_claims_status_update_check
    BEFORE UPDATE OF status ON CLAIMS
    BEGIN
        SELECT RAISE(ABORT, 'Status tidak valid.')
        WHERE NEW.status NOT IN ('belum dicek', 'perlu ditinjau', 'sudah dicek', 'ditolak');
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
        "ALTER TABLE CLAIMS ADD COLUMN kategori_simkatmawa TEXT",
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

    try:
        cursor.execute("ALTER TABLE REWARD_KONFIRMASI ADD COLUMN diproses_at TEXT")
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

    # ── Tabel AUDIT_LOG ───────────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS AUDIT_LOG (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        operator_id   INTEGER,
        operator_nama TEXT,
        aksi          TEXT    NOT NULL,
        target_tipe   TEXT,
        target_id     INTEGER,
        detail        TEXT,
        created_at    TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
        FOREIGN KEY (operator_id) REFERENCES USERS (id)
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_operator ON AUDIT_LOG (operator_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_created  ON AUDIT_LOG (created_at)")

    # Seed akun superadmin default jika belum ada
    cursor.execute("SELECT id FROM USERS WHERE username = 'admin'")
    if not cursor.fetchone():
        default_pass = os.getenv("ADMIN_DEFAULT_PASSWORD", "admin123")
        default_hash = bcrypt.hashpw(default_pass.encode(), bcrypt.gensalt()).decode()
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
                 nama_display="Mahasiswa",
                 kategori_simkatmawa=None):

    conn = _get_conn()
    cursor = conn.cursor()

    new_hash = generate_phash(sertifikat_path)

    # Bandingkan dengan klaim aktif (exclude ditolak agar mahasiswa bisa re-submit)
    cursor.execute("SELECT id, nama_lomba, peringkat, phash, kategori_simkatmawa FROM CLAIMS WHERE status != 'ditolak'")
    rows = cursor.fetchall()

    flagged         = False
    mirip_dengan_id = None
    detail          = {}

    _LOMBA_GRUP = {"lomba_mandiri_puspresnas", "lomba_mandiri_non_puspresnas"}
    is_rekognisi = (kategori_simkatmawa == "rekognisi")
    is_lomba     = (kategori_simkatmawa in _LOMBA_GRUP)

    for row in rows:
        old_id, old_nama, old_peringkat, old_phash_str, old_kategori = row

        # Hanya bandingkan dalam grup yang sama; klaim lama tanpa kategori dilewati
        if old_kategori is None:
            continue
        old_is_rekognisi = (old_kategori == "rekognisi")
        old_is_lomba     = (old_kategori in _LOMBA_GRUP)
        if is_rekognisi and not old_is_rekognisi:
            continue
        if is_lomba and not old_is_lomba:
            continue

        # Deteksi kemiripan: TSR + pHash untuk semua kategori
        sim_nama   = token_sort_ratio(nama_lomba, old_nama)
        nama_mirip = sim_nama >= FUZZY_THRESHOLD
        print(f"[Tahap 1] vs ID {old_id} ({old_kategori}): similarity nama={sim_nama}% → {'MIRIP' if nama_mirip else 'aman'}")

        old_hash    = imagehash.hex_to_hash(old_phash_str)
        distance    = int(hamming_distance(new_hash, old_hash))
        phash_mirip = distance <= PHASH_THRESHOLD
        print(f"[Tahap 2] vs ID {old_id}: Hamming distance={distance} → {'MIRIP' if phash_mirip else 'aman'}")

        if phash_mirip or nama_mirip:
            alasan = []
            if phash_mirip: alasan.append("gambar")
            if nama_mirip:  alasan.append("nama")
            print(f"[Tahap 3] vs ID {old_id}: kemiripan terdeteksi ({', '.join(alasan)}) — cek peringkat/kategori...")

            if peringkat == old_peringkat:
                flagged         = True
                mirip_dengan_id = old_id
                detail          = {
                    "duplikat_dengan_id": old_id,
                    "similarity_nama":    sim_nama,
                    "distance_phash":     distance,
                    "flag_alasan":        ", ".join(alasan),
                }
                print(f"[FLAGGED] Mirip dengan ID {old_id} — alasan: {', '.join(alasan)}, peringkat/kategori sama ({peringkat})")
                break
            else:
                print(f"[Info] vs ID {old_id}: kemiripan terdeteksi tapi peringkat/kategori berbeda ({peringkat} vs {old_peringkat}) — tidak di-flag")

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
             phash, status, mahasiswa_email, nama_display, mirip_dengan_id, flag_alasan, periode_id,
             kategori_simkatmawa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        nama_lomba, tingkat, tanggal, peringkat, sertifikat_path,
        str(new_hash), status, mahasiswa_email, nama_display, mirip_dengan_id, flag_alasan, periode_id,
        kategori_simkatmawa,
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

def reject_claim(claim_id: int, operator_id: int = None, catatan: str = None):
    conn = _get_conn()
    conn.execute(
        "UPDATE CLAIMS SET status = 'ditolak', verified_by = ?, catatan_penolakan = ? WHERE id = ?",
        (operator_id, catatan, claim_id),
    )
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
        "catatan_penolakan":   row[14] if len(row) > 14 else None,
        "periode_id":          row[15] if len(row) > 15 else None,
        "periode_nama":        row[16] if len(row) > 16 else None,
        "kategori":              row[17] if len(row) > 17 else None,
        "estimasi_reward":       row[18] if len(row) > 18 else None,
        "pengajuan_created_at":  row[19] if len(row) > 19 else None,
        "tanggal_mulai":         row[20] if len(row) > 20 else None,
        "tanggal_selesai":       row[21] if len(row) > 21 else None,
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
               u.nama AS verified_by_nama, c.flag_alasan, c.catatan_penolakan,
               c.periode_id, pk.nama AS periode_nama,
               p.kategori_simkatmawa, p.estimasi_reward,
               p.created_at AS pengajuan_created_at
        FROM CLAIMS c
        LEFT JOIN USERS u ON u.id = c.verified_by
        LEFT JOIN PERIODE_KLAIM pk ON pk.id = c.periode_id
        LEFT JOIN PENGAJUAN p ON p.claim_id = c.id
        WHERE (pk.status IS NULL OR pk.status != 'diarsipkan')
          AND c.status != 'ditolak'
        ORDER BY c.id ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_dict(row) for row in rows]

def get_ditolak_claims():
    """Kembalikan semua klaim berstatus ditolak (untuk riwayat operator)."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id, c.nama_lomba, c.tingkat, c.tanggal, c.peringkat,
               c.sertifikat_path, c.status, c.mahasiswa_email, c.nama_display,
               c.mirip_dengan_id, c.verified_by, c.verified_at,
               u.nama AS verified_by_nama, c.flag_alasan, c.catatan_penolakan
        FROM CLAIMS c
        LEFT JOIN USERS u ON u.id = c.verified_by
        LEFT JOIN PERIODE_KLAIM pk ON pk.id = c.periode_id
        WHERE c.status = 'ditolak'
          AND (pk.status IS NULL OR pk.status != 'diarsipkan')
        ORDER BY c.verified_at DESC
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


def get_pengajuan_by_id(pengajuan_id: int):
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM PENGAJUAN WHERE id = ?", (pengajuan_id,))
    row = cursor.fetchone()
    if not row:
        return None
    cols = [d[0] for d in cursor.description]
    return dict(zip(cols, row))


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


def get_klaim_sebagai_anggota(nim: str) -> list:
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, p.id AS pengajuan_id, rk.reward_status AS reward_status_tim
        FROM PENGAJUAN_ANGGOTA pa
        JOIN PENGAJUAN p ON pa.pengajuan_id = p.id
        JOIN CLAIMS c ON p.claim_id = c.id
        LEFT JOIN REWARD_KONFIRMASI rk ON rk.claim_id = c.id
        WHERE pa.nim_anggota = ?
          AND p.claim_id IS NOT NULL
        ORDER BY c.id DESC
    """, (nim,))
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    result = [dict(zip(cols, row)) for row in rows]
    for item in result:
        item["is_anggota"] = True
    return result


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
    cursor.execute("""
        SELECT claim_id, nama_kegiatan, kategori_kegiatan, tingkatan,
               capaian, tanggal_mulai, tahun_kegiatan, kategori_simkatmawa
        FROM PENGAJUAN WHERE id = ?
    """, (pengajuan_id,))
    row = cursor.fetchone()
    if row:
        claim_id, nama_kegiatan, kategori_kegiatan, tingkatan, capaian, tanggal_mulai, tahun_kegiatan, kategori_simkatmawa = row
        is_lomba = kategori_simkatmawa in ("lomba_mandiri_puspresnas", "lomba_mandiri_non_puspresnas")
        # Lomba: tingkat=kategori_kegiatan, peringkat=capaian
        # Rekognisi: tingkat=tingkatan, peringkat=kategori_kegiatan
        tingkat_baru   = kategori_kegiatan if is_lomba else tingkatan
        peringkat_baru = capaian if is_lomba else kategori_kegiatan
        tanggal_baru   = tanggal_mulai or tahun_kegiatan
        claim_updates = {}
        if nama_kegiatan:  claim_updates["nama_lomba"] = nama_kegiatan
        if tingkat_baru:   claim_updates["tingkat"]    = tingkat_baru
        if peringkat_baru: claim_updates["peringkat"]  = peringkat_baru
        if tanggal_baru:   claim_updates["tanggal"]    = tanggal_baru
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
               u.nama AS verified_by_nama, c.flag_alasan, c.catatan_penolakan,
               c.periode_id, pk.nama AS periode_nama,
               p.kategori_simkatmawa, p.estimasi_reward
        FROM CLAIMS c
        LEFT JOIN USERS u ON u.id = c.verified_by
        LEFT JOIN PERIODE_KLAIM pk ON pk.id = c.periode_id
        LEFT JOIN PENGAJUAN p ON p.claim_id = c.id
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
               u.nama AS verified_by_nama, c.flag_alasan, c.catatan_penolakan,
               c.periode_id, pk.nama AS periode_nama,
               p.kategori_simkatmawa, p.estimasi_reward,
               p.created_at AS pengajuan_created_at,
               p.tanggal_mulai, p.tanggal_selesai
        FROM CLAIMS c
        LEFT JOIN USERS u ON u.id = c.verified_by
        LEFT JOIN PERIODE_KLAIM pk ON pk.id = c.periode_id
        LEFT JOIN PENGAJUAN p ON p.claim_id = c.id
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


def get_reward_konfirmasi_by_id(reward_id: int):
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM REWARD_KONFIRMASI WHERE id = ?", (reward_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    cols = [d[0] for d in cursor.description]
    conn.close()
    return dict(zip(cols, row))


def update_reward_status(reward_id: int, status: str, catatan: str = None):
    conn = _get_conn()
    ts = "DATETIME('now', 'localtime')" if status == "diproses" else "NULL"
    if catatan is not None:
        conn.execute(
            f"UPDATE REWARD_KONFIRMASI SET reward_status = ?, catatan_operator = ?, diproses_at = {ts} WHERE id = ?",
            (status, catatan, reward_id)
        )
    else:
        conn.execute(
            f"UPDATE REWARD_KONFIRMASI SET reward_status = ?, diproses_at = {ts} WHERE id = ?",
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
# Audit Log
# ---------------------------------------------------------------------------
def insert_audit_log(operator_id: int, operator_nama: str, aksi: str,
                     target_tipe: str = None, target_id: int = None, detail: str = None):
    conn = _get_conn()
    conn.execute(
        """INSERT INTO AUDIT_LOG (operator_id, operator_nama, aksi, target_tipe, target_id, detail)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (operator_id, operator_nama, aksi, target_tipe, target_id, detail),
    )
    conn.commit()
    conn.close()


def get_audit_log(date_from: str = None, date_to: str = None, limit: int = 1000) -> list:
    conn = _get_conn()
    cursor = conn.cursor()
    conditions = []
    params = []
    if date_from:
        conditions.append("a.created_at >= ?")
        params.append(date_from + " 00:00:00")
    if date_to:
        conditions.append("a.created_at <= ?")
        params.append(date_to + " 23:59:59")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.append(limit)
    cursor.execute(f"""
        SELECT a.id, a.operator_id, a.operator_nama, a.aksi,
               a.target_tipe, a.target_id, a.detail, a.created_at,
               u.nama AS op_nama_saat_ini
        FROM AUDIT_LOG a
        LEFT JOIN USERS u ON u.id = a.operator_id
        {where}
        ORDER BY a.created_at DESC
        LIMIT ?
    """, params)
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    return [dict(zip(cols, row)) for row in rows]


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
def get_stats_visualisasi(
    filter_fakultas:    str = None,
    filter_prodi:       str = None,
    filter_tahun:       str = None,
    filter_tingkatan:   str = None,
    filter_kategori:    str = None,
    filter_kepesertaan: str = None,
) -> dict:
    from backend.nim_parser import parse_nim

    conn = _get_conn()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.mahasiswa_email, c.tanggal, c.tingkat, c.status,
               p.kategori_simkatmawa, p.tahun_kegiatan, p.jenis_kepesertaan
        FROM CLAIMS c
        LEFT JOIN PENGAJUAN p ON p.claim_id = c.id
        ORDER BY c.id
    """)
    rows = cursor.fetchall()
    conn.close()

    # Normalisasi semua baris ke dict terlebih dahulu
    all_rows = []
    for (email, tanggal, tingkat, status, kat_simkat, tahun_keg, kepesertaan) in rows:
        parsed     = parse_nim(email)
        row_fak    = parsed["fakultas"] if parsed.get("valid") else "Lainnya"
        row_prodi  = parsed["prodi"]    if parsed.get("valid") else "Lainnya"
        row_tahun  = tahun_keg or (tanggal[:4] if tanggal and len(tanggal) >= 4 else None)
        all_rows.append({
            "fakultas":    row_fak,
            "prodi":       row_prodi,
            "tahun":       row_tahun,
            "tingkatan":   tingkat       or "Tidak Diketahui",
            "status":      status        or "Tidak Diketahui",
            "kategori":    kat_simkat    or "tidak_diketahui",
            "kepesertaan": kepesertaan   or "Tidak Diketahui",
        })

    # Bangun filter_options dari data PENUH (tidak terpengaruh filter aktif)
    def unique_sorted(vals):
        return sorted(v for v in set(vals) if v and v not in ("Lainnya", "Tidak Diketahui", "tidak_diketahui"))

    prodi_by_fak = {}
    for d in all_rows:
        prodi_by_fak.setdefault(d["fakultas"], set())
        if d["prodi"] not in ("Lainnya", "Tidak Diketahui"):
            prodi_by_fak[d["fakultas"]].add(d["prodi"])
    prodi_by_fak = {k: sorted(v) for k, v in prodi_by_fak.items()}

    filter_options = {
        "fakultas":          unique_sorted(d["fakultas"]    for d in all_rows),
        "prodi_by_fakultas": prodi_by_fak,
        "tahun":             unique_sorted(d["tahun"]       for d in all_rows if d["tahun"]),
        "tingkatan":         unique_sorted(d["tingkatan"]   for d in all_rows),
        "kepesertaan":       unique_sorted(d["kepesertaan"] for d in all_rows),
    }

    # Terapkan filter
    filtered = all_rows
    if filter_fakultas:
        filtered = [d for d in filtered if d["fakultas"]    == filter_fakultas]
    if filter_prodi:
        filtered = [d for d in filtered if d["prodi"]       == filter_prodi]
    if filter_tahun:
        filtered = [d for d in filtered if d["tahun"]       == filter_tahun]
    if filter_tingkatan:
        filtered = [d for d in filtered if d["tingkatan"]   == filter_tingkatan]
    if filter_kategori:
        filtered = [d for d in filtered if d["kategori"]    == filter_kategori]
    if filter_kepesertaan:
        filtered = [d for d in filtered if d["kepesertaan"] == filter_kepesertaan]

    # Agregasi
    from collections import defaultdict
    fak_count  = defaultdict(int)
    prod_count = defaultdict(int)
    jenis_count  = defaultdict(int)
    tahun_count  = defaultdict(int)
    tingkat_count = defaultdict(int)
    kp_count   = defaultdict(int)
    status_count = defaultdict(int)

    for d in filtered:
        fak_count[d["fakultas"]]   += 1
        prod_count[d["prodi"]]     += 1
        tahun_count[d["tahun"] or "—"] += 1
        tingkat_count[d["tingkatan"]]  += 1
        kp_count[d["kepesertaan"]]     += 1

        k = d["kategori"]
        if k == "lomba_mandiri_puspresnas":
            jenis_count["Lomba Mandiri Puspresnas"] += 1
        elif k == "lomba_mandiri_non_puspresnas":
            jenis_count["Lomba Mandiri Non-Puspresnas"] += 1
        elif k == "rekognisi":
            jenis_count["Rekognisi Non-Lomba"] += 1
        else:
            jenis_count["Tidak Diketahui"] += 1

        st = d["status"]
        if st == "sudah dicek":
            status_count["Disetujui"] += 1
        elif st == "ditolak":
            status_count["Ditolak"] += 1
        elif st == "perlu ditinjau":
            status_count["Perlu Ditinjau"] += 1
        else:
            status_count["Dalam Proses"] += 1

    def to_list(d):
        return sorted([{"name": k, "count": v} for k, v in d.items()], key=lambda x: -x["count"])

    def to_list_key(d):
        return sorted([{"name": k, "count": v} for k, v in d.items()], key=lambda x: x["name"])

    # Heatmap: Fakultas × Tahun
    heatmap_cells: dict = {}
    for d in filtered:
        fak   = d["fakultas"]
        tahun = d["tahun"] or "—"
        heatmap_cells.setdefault(fak, {})
        heatmap_cells[fak][tahun] = heatmap_cells[fak].get(tahun, 0) + 1

    heatmap_cols = sorted({t for cells in heatmap_cells.values() for t in cells})
    heatmap_rows = sorted(heatmap_cells.keys(), key=lambda f: -sum(heatmap_cells[f].values()))
    heatmap_max  = max((v for cells in heatmap_cells.values() for v in cells.values()), default=1)

    return {
        "total":          len(filtered),
        "by_status":      to_list(status_count),
        "by_fakultas":    to_list(fak_count),
        "by_prodi":       to_list(prod_count),
        "by_jenis":       to_list(jenis_count),
        "by_tahun":       to_list_key(tahun_count),
        "by_tingkatan":   to_list(tingkat_count),
        "by_kepesertaan": to_list(kp_count),
        "filter_options": filter_options,
        "heatmap": {
            "rows":  heatmap_rows,
            "cols":  heatmap_cols,
            "cells": heatmap_cells,
            "max":   heatmap_max,
        },
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
               COUNT(c.id)                                               AS jumlah_klaim,
               SUM(CASE WHEN c.status = 'sudah dicek' THEN 1 ELSE 0 END)  AS klaim_disetujui,
               SUM(CASE WHEN c.status = 'ditolak'     THEN 1 ELSE 0 END)  AS klaim_ditolak,
               SUM(CASE WHEN rk.reward_status = 'selesai' THEN 1 ELSE 0 END) AS reward_selesai,
               SUM(CASE WHEN c.status IN ('belum dicek', 'perlu ditinjau') THEN 1 ELSE 0 END) AS klaim_pending,
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


def get_periode_nama(periode_id: int):
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT nama FROM PERIODE_KLAIM WHERE id = ?", (periode_id,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None


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


def update_periode_status(periode_id: int, status: str) -> dict:
    """Ubah status periode: 'aktif', 'tutup', atau 'ditutup'. Hanya 1 periode aktif sekaligus."""
    if status not in ("aktif", "tutup", "ditutup"):
        return {"ok": False, "alasan": "Status tidak valid. Gunakan 'aktif', 'tutup', atau 'ditutup'."}
    conn = _get_conn()
    cursor = conn.cursor()

    # Saat menutup periode, cek apakah masih ada klaim yang belum diverifikasi
    if status == "ditutup":
        cursor.execute("""
            SELECT COUNT(*) FROM CLAIMS
            WHERE periode_id = ? AND status IN ('belum dicek', 'perlu ditinjau')
        """, (periode_id,))
        klaim_pending = cursor.fetchone()[0]
        if klaim_pending > 0:
            conn.close()
            return {
                "ok": False,
                "alasan": f"Masih ada {klaim_pending} klaim yang belum diverifikasi (belum dicek / perlu ditinjau). Selesaikan semua klaim terlebih dahulu sebelum menutup periode.",
            }

    if status == "aktif":
        conn.execute("UPDATE PERIODE_KLAIM SET status = 'tutup' WHERE status = 'aktif'")
    conn.execute("UPDATE PERIODE_KLAIM SET status = ? WHERE id = ?", (status, periode_id))
    conn.commit()
    conn.close()
    return {"ok": True}


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

    # Cek klaim yang sudah disetujui tapi mahasiswa belum mengisi data reward sama sekali
    cursor.execute("""
        SELECT COUNT(*) FROM CLAIMS c
        LEFT JOIN REWARD_KONFIRMASI rk ON rk.claim_id = c.id
        WHERE c.periode_id = ? AND c.status = 'sudah dicek' AND rk.id IS NULL
    """, (periode_id,))
    reward_belum_diisi = cursor.fetchone()[0]

    if reward_belum_diisi > 0:
        conn.close()
        return {
            "ok": False,
            "alasan": f"Masih ada {reward_belum_diisi} klaim yang sudah disetujui namun mahasiswa belum mengisi data reward.",
            "reward_belum_diisi": reward_belum_diisi,
        }

    # Hitung reward yang sudah diisi tapi belum selesai diproses operator
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
               u.nama AS verified_by_nama, c.flag_alasan, c.catatan_penolakan,
               p.tanggal_mulai, p.tanggal_selesai, p.jenis_kepesertaan, p.nama_ketua,
               GROUP_CONCAT(a.nama_anggota || '|' || a.nim_anggota, ';;') AS anggota_list
        FROM CLAIMS c
        LEFT JOIN USERS u             ON u.id            = c.verified_by
        LEFT JOIN PENGAJUAN p         ON p.claim_id      = c.id
        LEFT JOIN PENGAJUAN_ANGGOTA a ON a.pengajuan_id  = p.id
        WHERE c.periode_id = ?
        GROUP BY c.id
        ORDER BY c.id DESC
    """, (periode_id,))
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    result = []
    for row in rows:
        d = _row_to_dict(row)
        d["tanggal_mulai"]     = row[15]
        d["tanggal_selesai"]   = row[16]
        d["jenis_kepesertaan"] = row[17]
        d["nama_ketua"]        = row[18]
        d["anggota_list"]      = row[19]
        result.append(d)
    return result


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


def get_export_data(
    filter_fakultas:    str = None,
    filter_prodi:       str = None,
    filter_tahun:       str = None,
    filter_tingkatan:   str = None,
    filter_kategori:    str = None,
    filter_kepesertaan: str = None,
) -> list:
    from backend.nim_parser import parse_nim

    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id, c.nama_lomba, c.tingkat, c.tanggal, c.peringkat, c.status,
               c.mahasiswa_email, c.nama_display, c.verified_at, c.catatan_penolakan,
               u.nama  AS verified_by_nama,
               p.kategori_simkatmawa, p.jenis_kepesertaan, p.tahun_kegiatan,
               p.nama_kegiatan, p.tingkatan AS tingkatan_p, p.capaian,
               p.tanggal_mulai, p.tanggal_selesai, p.nama_ketua,
               GROUP_CONCAT(a.nama_anggota || '|' || a.nim_anggota, ';;') AS anggota_list
        FROM CLAIMS c
        LEFT JOIN USERS u           ON u.id          = c.verified_by
        LEFT JOIN PENGAJUAN p       ON p.claim_id    = c.id
        LEFT JOIN PENGAJUAN_ANGGOTA a ON a.pengajuan_id = p.id
        GROUP BY c.id
        ORDER BY c.id DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for row in rows:
        (cid, nama_lomba, tingkat, tanggal, peringkat, status,
         email, nama_display, verified_at, catatan,
         verified_by_nama,
         kat_simkat, kepesertaan, tahun_keg, nama_keg, tingkatan_p, capaian,
         tanggal_mulai, tanggal_selesai, nama_ketua, anggota_list) = row

        parsed    = parse_nim(email)
        nim       = parsed.get("nim", email.split("@")[0]) if parsed.get("valid") else email.split("@")[0]
        fakultas  = parsed.get("fakultas", "Lainnya")       if parsed.get("valid") else "Lainnya"
        prodi     = parsed.get("prodi",    "Lainnya")        if parsed.get("valid") else "Lainnya"
        angkatan  = parsed.get("angkatan", "")               if parsed.get("valid") else ""

        tahun_final    = tahun_keg or (tanggal[:4] if tanggal and len(tanggal) >= 4 else "")
        nama_keg_final = nama_keg or nama_lomba
        tingkat_final  = tingkatan_p or tingkat
        capaian_final  = capaian or peringkat

        # Terapkan filter
        if filter_fakultas    and fakultas      != filter_fakultas:    continue
        if filter_prodi       and prodi         != filter_prodi:       continue
        if filter_tahun       and tahun_final   != filter_tahun:       continue
        if filter_tingkatan   and tingkat_final != filter_tingkatan:   continue
        if filter_kategori    and (kat_simkat or "") != filter_kategori: continue
        if filter_kepesertaan and (kepesertaan or "") != filter_kepesertaan: continue

        if status == "sudah dicek":
            status_label = "Disetujui"
        elif status == "ditolak":
            status_label = "Ditolak"
        elif status == "perlu ditinjau":
            status_label = "Perlu Ditinjau"
        else:
            status_label = "Dalam Proses"

        if kat_simkat == "lomba_mandiri_puspresnas":
            kat_label = "Lomba Mandiri Puspresnas"
        elif kat_simkat == "lomba_mandiri_non_puspresnas":
            kat_label = "Lomba Mandiri Non-Puspresnas"
        elif kat_simkat == "rekognisi":
            kat_label = "Rekognisi Non-Lomba"
        else:
            kat_label = ""

        # Susun daftar anggota kelompok (ketua + anggota lainnya)
        anggota_gabung = ""
        if kepesertaan == "kelompok":
            parts = []
            if nama_ketua:
                nim_ketua = email.split("@")[0] if "@" in email else ""
                parts.append(f"{nama_ketua} ({nim_ketua}) - Ketua")
            if anggota_list:
                for entry in anggota_list.split(";;"):
                    if "|" in entry:
                        nama_a, nim_a = entry.split("|", 1)
                        parts.append(f"{nama_a} ({nim_a})")
                    else:
                        parts.append(entry)
            anggota_gabung = ", ".join(parts)

        result.append({
            "NIM":                 nim,
            "Nama Mahasiswa":      nama_display or "",
            "Email":               email,
            "Fakultas":            fakultas,
            "Program Studi":       prodi,
            "Angkatan":            angkatan,
            "Nama Kegiatan":       nama_keg_final or "",
            "Tingkatan":           tingkat_final or "",
            "Tahun Kegiatan":      tahun_final,
            "Tanggal Mulai":       tanggal_mulai or "",
            "Tanggal Selesai":     tanggal_selesai or "",
            "Jenis Kepesertaan":   kepesertaan or "",
            "Anggota Kelompok":    anggota_gabung,
            "Kategori SIMKATMAWA": kat_label,
            "Capaian / Peringkat": capaian_final or "",
            "Status Klaim":        status_label,
            "Diverifikasi Oleh":   verified_by_nama or "",
            "Tanggal Verifikasi":  _fmt_datetime(verified_at),
            "Catatan Penolakan":   catatan or "",
        })

    return result


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
    conn.execute("UPDATE CLAIMS    SET verified_by  = NULL WHERE verified_by  = ?", (operator_id,))
    conn.execute("UPDATE AUDIT_LOG SET operator_id  = NULL WHERE operator_id  = ?", (operator_id,))
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
