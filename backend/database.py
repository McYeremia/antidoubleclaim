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
    # Mengubah format datetime SQLite menjadi format Indonesia, contoh: '3 Mei 2026, 14:30'.
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
    # Membuka koneksi ke file claims.db dengan foreign key aktif.
    conn = sqlite3.connect("claims.db", timeout=10)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

# ---------------------------------------------------------------------------
# Inisialisasi skema database
# ---------------------------------------------------------------------------
def create_database():
    # Membuat semua tabel jika belum ada, menjalankan migrasi kolom baru, dan seed akun superadmin default.
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
    # Menyimpan klaim baru ke DB dan mendeteksi duplikat via pHash + fuzzy nama lomba.

    conn = _get_conn()
    cursor = conn.cursor()

    new_hash = generate_phash(sertifikat_path)

    # Bandingkan dengan klaim aktif (exclude ditolak agar mahasiswa bisa re-submit)
    cursor.execute("SELECT id, nama_lomba, peringkat, phash, kategori_simkatmawa FROM CLAIMS WHERE status != 'ditolak'")
    rows = cursor.fetchall()

    flagged         = False   # True jika klaim baru terdeteksi mirip dengan klaim lain
    mirip_dengan_id = None    # ID klaim lama yang paling mirip (diisi jika flagged)
    detail          = {}      # Informasi detail kemiripan untuk dikembalikan ke pemanggil

    # Dua sub-kategori lomba yang diperlakukan sama dalam proses perbandingan
    _LOMBA_GRUP = {"lomba_mandiri_puspresnas", "lomba_mandiri_non_puspresnas"}

    # Tentukan tipe klaim BARU — digunakan untuk memastikan perbandingan hanya dilakukan antar tipe yang sama
    is_rekognisi = (kategori_simkatmawa == "rekognisi")
    is_lomba     = (kategori_simkatmawa in _LOMBA_GRUP)

    for row in rows:
        old_id, old_nama, old_peringkat, old_phash_str, old_kategori = row
        # old_kategori = tipe klaim LAMA (rekognisi / lomba_mandiri_puspresnas / lomba_mandiri_non_puspresnas)

        # Klaim lama tanpa kategori (data sebelum fitur kategori ditambahkan) tidak bisa dibandingkan
        if old_kategori is None:
            continue

        old_is_rekognisi = (old_kategori == "rekognisi")
        old_is_lomba     = (old_kategori in _LOMBA_GRUP)

        # Rekognisi hanya dibandingkan dengan rekognisi, lomba hanya dengan lomba
        # Alasan: rekognisi dan lomba memiliki definisi peringkat yang berbeda, tidak bisa disilangkan
        if is_rekognisi and not old_is_rekognisi:
            continue
        if is_lomba and not old_is_lomba:
            continue

        # --- Tahap 1: Bandingkan nama lomba menggunakan Token Sort Ratio (TSR) ---
        # TSR mengurutkan token dulu sebelum dibandingkan, sehingga urutan kata tidak mempengaruhi skor
        sim_nama   = token_sort_ratio(nama_lomba, old_nama)
        nama_mirip = sim_nama >= FUZZY_THRESHOLD   # FUZZY_THRESHOLD = 80
        print(f"[Tahap 1] vs ID {old_id} ({old_kategori}): similarity nama={sim_nama}% → {'MIRIP' if nama_mirip else 'aman'}")

        # --- Tahap 2: Bandingkan gambar sertifikat menggunakan pHash + Hamming distance ---
        # old_phash_str disimpan sebagai hex string di DB, diubah kembali ke objek ImageHash
        old_hash    = imagehash.hex_to_hash(old_phash_str)
        distance    = int(hamming_distance(new_hash, old_hash))  # semakin kecil = semakin mirip
        phash_mirip = distance <= PHASH_THRESHOLD  # PHASH_THRESHOLD = 10
        print(f"[Tahap 2] vs ID {old_id}: Hamming distance={distance} → {'MIRIP' if phash_mirip else 'aman'}")

        # --- Tahap 3: Jika salah satu metode mendeteksi kemiripan, cek apakah peringkat sama ---
        # Menggunakan OR (bukan AND) agar sistem lebih sensitif — lebih baik false positive
        # daripada duplikat lolos tanpa terdeteksi
        if phash_mirip or nama_mirip:
            alasan = []
            if phash_mirip: alasan.append("gambar")
            if nama_mirip:  alasan.append("nama")
            print(f"[Tahap 3] vs ID {old_id}: kemiripan terdeteksi ({', '.join(alasan)}) — cek peringkat/kategori...")

            # Peringkat harus sama untuk dianggap duplikat.
            # Jika peringkat berbeda → lomba yang sama tapi capaian berbeda, bukan double claim
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
                break  # cukup temukan satu klaim yang mirip, tidak perlu scan semua klaim lainnya
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
    # Mengubah status klaim menjadi 'sudah dicek' dan mencatat operator yang memverifikasi.
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
    # Mengubah status klaim menjadi 'ditolak' beserta catatan alasan penolakan.
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
    # Mengubah row hasil query CLAIMS menjadi dictionary Python.
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
    # Mengambil semua klaim aktif kecuali yang berasal dari periode diarsipkan dan klaim ditolak.
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
    # Mengambil semua klaim berstatus ditolak untuk ditampilkan di riwayat operator.
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
    # Menyimpan data pengajuan SIMKATMAWA beserta daftar anggota kelompok jika ada.
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

    # Simpan daftar anggota kelompok ke tabel terpisah (PENGAJUAN_ANGGOTA)
    # anggota adalah list of dict: [{"nama": "...", "nim": "..."}, ...]
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
    # Mengambil semua pengajuan milik mahasiswa berdasarkan email beserta daftar anggotanya.
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.*, GROUP_CONCAT(a.nama_anggota || '|' || a.nim_anggota, ';;') AS anggota_list
        FROM PENGAJUAN p
        LEFT JOIN PENGAJUAN_ANGGOTA a ON a.pengajuan_id = p.id
        WHERE p.mahasiswa_email = ?
        GROUP BY p.id   -- GROUP BY diperlukan agar GROUP_CONCAT bekerja per pengajuan
        ORDER BY p.id DESC
    """, (email,))
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    # dict(zip(cols, row)) mengubah row tuple menjadi dict dengan nama kolom sebagai key
    return [dict(zip(cols, row)) for row in rows]


def get_pengajuan_by_id(pengajuan_id: int):
    # Mengambil satu data pengajuan berdasarkan ID-nya.
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM PENGAJUAN WHERE id = ?", (pengajuan_id,))
    row = cursor.fetchone()
    if not row:
        return None
    cols = [d[0] for d in cursor.description]
    return dict(zip(cols, row))


def get_pengajuan_by_claim_id(claim_id: int):
    # Mengambil data pengajuan yang terhubung ke klaim tertentu beserta daftar anggotanya.
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
    # Mengambil klaim di mana mahasiswa terdaftar sebagai anggota kelompok (bukan ketua).
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
    # Memperbarui data pengajuan dan menyinkronkan field terkait ke tabel CLAIMS.
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

        # Pemetaan field PENGAJUAN → CLAIMS berbeda tergantung kategori:
        #
        #   Lomba    : tingkat  = kategori_kegiatan (mis. "Nasional", "Internasional")
        #              peringkat = capaian           (mis. "Juara 1", "Juara 2")
        #
        #   Rekognisi: tingkat  = tingkatan          (mis. "Nasional")
        #              peringkat = kategori_kegiatan  (mis. "Presenter", "Peserta")
        #
        # Ini karena makna "peringkat" dan "tingkat" berbeda antara lomba dan rekognisi
        tingkat_baru   = kategori_kegiatan if is_lomba else tingkatan
        peringkat_baru = capaian if is_lomba else kategori_kegiatan
        tanggal_baru   = tanggal_mulai or tahun_kegiatan  # tanggal_mulai diutamakan, fallback ke tahun
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
    # Mengambil semua klaim milik satu mahasiswa berdasarkan email.
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
    # Mengambil detail satu klaim beserta data pengajuan, periode, dan operator yang memverifikasi.
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
    # Menyimpan data konfirmasi reward yang diisi mahasiswa setelah klaim disetujui.
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
    # Memperbarui data form reward dan mereset statusnya ke 'menunggu' untuk pengiriman ulang.
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
    # Mengambil data reward berdasarkan ID klaim yang terhubung.
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
    # Mengambil semua data reward milik satu mahasiswa berdasarkan email.
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


def get_all_reward_konfirmasi() -> list:
    # Mengambil semua data reward konfirmasi kecuali yang berasal dari periode diarsipkan.
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT rk.*, c.nama_lomba, p.estimasi_reward
        FROM REWARD_KONFIRMASI rk
        LEFT JOIN CLAIMS c ON c.id = rk.claim_id
        LEFT JOIN PENGAJUAN p ON p.claim_id = rk.claim_id
        LEFT JOIN PERIODE_KLAIM pk ON pk.id = c.periode_id
        WHERE (pk.status IS NULL OR pk.status != 'diarsipkan')
        ORDER BY rk.id DESC
    """)
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    return [dict(zip(cols, row)) for row in rows]


def get_reward_konfirmasi_by_id(reward_id: int):
    # Mengambil satu data reward berdasarkan ID reward-nya.
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
    # Mengubah status reward dan mencatat waktu diproses jika status berubah menjadi 'diproses'.
    conn = _get_conn()
    # ts adalah ekspresi SQL (bukan nilai user), sehingga aman dimasukkan langsung ke query via f-string.
    # Jika status 'diproses', catat waktu sekarang; status lain reset diproses_at ke NULL
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
    # Mengambil semua akun operator yang terdaftar di sistem.
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, nama, email, role FROM USERS ORDER BY id")
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    return [dict(zip(cols, row)) for row in rows]


def get_operator_by_id(operator_id: int):
    # Mengambil data satu operator berdasarkan ID-nya.
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
    # Memverifikasi username dan password operator menggunakan bcrypt. Mengembalikan data user jika valid.
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
    # Membuat akun operator baru dengan password terenkripsi. Role bisa 'operator' atau 'superadmin'.
    if role not in ("operator", "superadmin"):
        return False
    # bcrypt.gensalt() menghasilkan salt acak setiap kali — password sama pun menghasilkan hash berbeda
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
        # UNIQUE constraint pada username/email dilanggar — username atau email sudah terdaftar
        return False
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------
def insert_audit_log(operator_id: int, operator_nama: str, aksi: str,
                     target_tipe: str = None, target_id: int = None, detail: str = None):
    # Mencatat setiap aksi yang dilakukan operator ke tabel AUDIT_LOG.
    conn = _get_conn()
    conn.execute(
        """INSERT INTO AUDIT_LOG (operator_id, operator_nama, aksi, target_tipe, target_id, detail)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (operator_id, operator_nama, aksi, target_tipe, target_id, detail),
    )
    conn.commit()
    conn.close()


def get_audit_log(date_from: str = None, date_to: str = None, limit: int = 1000) -> list:
    # Mengambil riwayat aksi operator dengan filter tanggal opsional, maksimal 1000 baris.
    conn = _get_conn()
    cursor = conn.cursor()
    # Bangun klausa WHERE secara dinamis hanya jika filter tanggal diberikan
    conditions = []
    params = []
    if date_from:
        conditions.append("a.created_at >= ?")
        params.append(date_from + " 00:00:00")   # awal hari
    if date_to:
        conditions.append("a.created_at <= ?")
        params.append(date_to + " 23:59:59")     # akhir hari
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
    # op_nama_saat_ini = nama operator saat ini (dari tabel USERS, bisa berbeda dengan operator_nama
    # yang direkam saat aksi terjadi jika nama operator pernah diubah)
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()
    return [dict(zip(cols, row)) for row in rows]


# ---------------------------------------------------------------------------
# Profil Mahasiswa
# ---------------------------------------------------------------------------
def get_profil_mahasiswa(email: str):
    # Mengambil data profil dan rekening mahasiswa berdasarkan email.
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
    # Menyimpan atau memperbarui data profil mahasiswa (insert jika belum ada, update jika sudah ada).
    conn = _get_conn()
    # ON CONFLICT(email) DO UPDATE = pola "upsert" SQLite:
    # jika email belum ada → INSERT, jika sudah ada → UPDATE kolom yang disebut
    # 'excluded.' merujuk ke nilai yang baru saja dicoba di-INSERT
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
    filter_fakultas:  str = None,
    filter_prodi:     str = None,
    filter_tahun:     str = None,
    filter_tingkatan: str = None,
    filter_kategori:  str = None,
    filter_periode:   str = None,
) -> dict:
    # Menghasilkan data statistik klaim yang sudah disetujui untuk keperluan visualisasi dan grafik.
    from backend.nim_parser import parse_nim

    conn = _get_conn()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.mahasiswa_email, c.tanggal, c.tingkat,
               p.kategori_simkatmawa, p.tahun_kegiatan,
               pk.nama AS periode_nama
        FROM CLAIMS c
        LEFT JOIN PENGAJUAN p ON p.claim_id = c.id
        LEFT JOIN PERIODE_KLAIM pk ON pk.id = c.periode_id
        WHERE c.status = 'sudah dicek'
        ORDER BY c.id
    """)
    rows = cursor.fetchall()
    conn.close()

    # Normalisasi setiap baris hasil query menjadi dict yang siap difilter dan dihitung.
    # Fakultas dan prodi diambil dari NIM (parsing email), bukan dari field bebas.
    # row_tahun: prioritaskan tahun_kegiatan dari pengajuan, fallback ke 4 karakter pertama tanggal klaim
    all_rows = []
    for (email, tanggal, tingkat, kat_simkat, tahun_keg, periode_nama) in rows:
        parsed    = parse_nim(email)
        row_fak   = parsed["fakultas"] if parsed.get("valid") else "Lainnya"
        row_prodi = parsed["prodi"]    if parsed.get("valid") else "Lainnya"
        row_tahun = tahun_keg or (tanggal[:4] if tanggal and len(tanggal) >= 4 else None)
        all_rows.append({
            "fakultas":  row_fak,
            "prodi":     row_prodi,
            "tahun":     row_tahun,
            "tingkatan": tingkat    or "Tidak Diketahui",
            "kategori":  kat_simkat or "tidak_diketahui",
            "periode":   periode_nama or "Tanpa Periode",
        })

    # Kembalikan nilai unik terurut, kecuali label generik (Lainnya, dll.)
    # Digunakan untuk membangun pilihan dropdown filter di frontend
    def unique_sorted(vals):
        return sorted(v for v in set(vals) if v and v not in ("Lainnya", "Tidak Diketahui", "tidak_diketahui", "Tanpa Periode"))

    # Buat mapping: { "Fakultas A": ["Prodi 1", "Prodi 2"], ... }
    # Digunakan agar dropdown prodi di frontend hanya menampilkan prodi milik fakultas yang dipilih
    prodi_by_fak = {}
    for d in all_rows:
        prodi_by_fak.setdefault(d["fakultas"], set())
        if d["prodi"] not in ("Lainnya", "Tidak Diketahui"):
            prodi_by_fak[d["fakultas"]].add(d["prodi"])
    prodi_by_fak = {k: sorted(v) for k, v in prodi_by_fak.items()}

    # filter_options dikirim ke frontend untuk mengisi pilihan dropdown filter
    filter_options = {
        "fakultas":          unique_sorted(d["fakultas"]  for d in all_rows),
        "prodi_by_fakultas": prodi_by_fak,
        "tahun":             unique_sorted(d["tahun"]     for d in all_rows if d["tahun"]),
        "tingkatan":         unique_sorted(d["tingkatan"] for d in all_rows),
        "periode":           unique_sorted(d["periode"]   for d in all_rows),
    }

    # Terapkan filter yang dikirim dari frontend — filter dijalankan satu per satu secara berurutan
    filtered = all_rows
    if filter_fakultas:
        filtered = [d for d in filtered if d["fakultas"]  == filter_fakultas]
    if filter_prodi:
        filtered = [d for d in filtered if d["prodi"]     == filter_prodi]
    if filter_tahun:
        filtered = [d for d in filtered if d["tahun"]     == filter_tahun]
    if filter_tingkatan:
        filtered = [d for d in filtered if d["tingkatan"] == filter_tingkatan]
    if filter_kategori:
        filtered = [d for d in filtered if d["kategori"]  == filter_kategori]
    if filter_periode:
        filtered = [d for d in filtered if d["periode"]   == filter_periode]

    # Hitung jumlah klaim per dimensi (fakultas, prodi, jenis, tahun, tingkatan, periode)
    from collections import defaultdict
    fak_count     = defaultdict(int)  # jumlah klaim per fakultas
    prod_count    = defaultdict(int)  # jumlah klaim per prodi
    jenis_count   = defaultdict(int)  # jumlah klaim per kategori SIMKATMAWA (label ramah-baca)
    tahun_count   = defaultdict(int)  # jumlah klaim per tahun kegiatan
    tingkat_count = defaultdict(int)  # jumlah klaim per tingkatan (nasional/internasional/dll)
    periode_count = defaultdict(int)  # jumlah klaim per periode pengumpulan

    for d in filtered:
        fak_count[d["fakultas"]]        += 1
        prod_count[d["prodi"]]          += 1
        tahun_count[d["tahun"] or "—"]  += 1
        tingkat_count[d["tingkatan"]]   += 1
        periode_count[d["periode"]]     += 1

        # Ubah nilai internal kategori menjadi label yang lebih mudah dibaca manusia
        k = d["kategori"]
        if k == "lomba_mandiri_puspresnas":
            jenis_count["Lomba Mandiri Puspresnas"] += 1
        elif k == "lomba_mandiri_non_puspresnas":
            jenis_count["Lomba Mandiri Non-Puspresnas"] += 1
        elif k == "rekognisi":
            jenis_count["Rekognisi Non-Lomba"] += 1
        else:
            jenis_count["Tidak Diketahui"] += 1

    # to_list: urutkan dari count terbesar (untuk chart batang/pie)
    def to_list(d):
        return sorted([{"name": k, "count": v} for k, v in d.items()], key=lambda x: -x["count"])

    # to_list_key: urutkan berdasarkan nama (untuk chart tahun agar tampil kronologis)
    def to_list_key(d):
        return sorted([{"name": k, "count": v} for k, v in d.items()], key=lambda x: x["name"])

    # Heatmap: matriks 2D (baris=fakultas, kolom=tahun) untuk menampilkan distribusi klaim
    # heatmap_cells[fakultas][tahun] = jumlah klaim
    heatmap_cells: dict = {}
    for d in filtered:
        fak   = d["fakultas"]
        tahun = d["tahun"] or "—"
        heatmap_cells.setdefault(fak, {})
        heatmap_cells[fak][tahun] = heatmap_cells[fak].get(tahun, 0) + 1

    heatmap_cols = sorted({t for cells in heatmap_cells.values() for t in cells})  # semua tahun unik, terurut
    heatmap_rows = sorted(heatmap_cells.keys(), key=lambda f: -sum(heatmap_cells[f].values()))  # fakultas terbanyak klaim di atas
    heatmap_max  = max((v for cells in heatmap_cells.values() for v in cells.values()), default=1)  # untuk skala warna

    return {
        "total":          len(filtered),
        "by_fakultas":    to_list(fak_count),
        "by_prodi":       to_list(prod_count),
        "by_jenis":       to_list(jenis_count),
        "by_tahun":       to_list_key(tahun_count),
        "by_tingkatan":   to_list(tingkat_count),
        "by_periode":     to_list(periode_count),
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
    # Mengambil periode yang mencakup hari ini. Jika tidak ada, fallback ke periode terakhir yang sudah lewat.
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
    # Mengambil periode yang sedang aktif saat ini (status 'aktif' dan tanggal hari ini masuk rentangnya).
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
    # Mengambil semua periode beserta statistik jumlah klaim dan reward di masing-masing periode.
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
    # Mengambil nama periode berdasarkan ID-nya, digunakan untuk keperluan audit log.
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT nama FROM PERIODE_KLAIM WHERE id = ?", (periode_id,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None


def create_periode(data: dict) -> int:
    # Membuat periode klaim baru dengan status awal 'tutup', harus diaktifkan manual oleh operator.
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
    # Mengubah status periode. Hanya satu periode yang boleh aktif sekaligus.
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

    # Hanya satu periode yang boleh aktif sekaligus:
    # sebelum mengaktifkan periode ini, semua periode lain yang aktif direset ke 'tutup'
    if status == "aktif":
        conn.execute("UPDATE PERIODE_KLAIM SET status = 'tutup' WHERE status = 'aktif'")
    conn.execute("UPDATE PERIODE_KLAIM SET status = ? WHERE id = ?", (status, periode_id))
    conn.commit()
    conn.close()
    return {"ok": True}


def arsipkan_periode(periode_id: int) -> dict:
    # Mengarsipkan periode jika semua klaim sudah diverifikasi dan semua reward sudah selesai diproses.
    # Periode yang sudah diarsipkan tidak akan muncul lagi di daftar klaim/reward aktif.
    conn = _get_conn()
    cursor = conn.cursor()

    # [Validasi 1] Periode harus sudah ditutup terlebih dahulu sebelum bisa diarsipkan
    cursor.execute("SELECT status FROM PERIODE_KLAIM WHERE id = ?", (periode_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"ok": False, "alasan": "Periode tidak ditemukan"}
    if row[0] not in ("tutup", "ditutup"):
        conn.close()
        return {"ok": False, "alasan": "Hanya periode yang sudah ditutup yang dapat diarsipkan"}

    # [Validasi 2] Semua klaim pada periode ini harus sudah diverifikasi (approved/rejected)
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

    # [Validasi 3] Klaim yang sudah disetujui harus sudah diisi data reward oleh mahasiswa
    # (rk.id IS NULL artinya mahasiswa belum pernah submit form konfirmasi reward)
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

    # [Validasi 4] Semua reward yang sudah diisi harus sudah selesai diproses operator (status 'selesai')
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
    # Mengambil semua klaim yang terdaftar pada periode tertentu beserta data anggota kelompok.
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id, c.nama_lomba, c.tingkat, c.tanggal, c.peringkat,
               c.sertifikat_path, c.status, c.mahasiswa_email, c.nama_display,
               c.mirip_dengan_id, c.verified_by, c.verified_at,
               u.nama AS verified_by_nama, c.flag_alasan, c.catatan_penolakan,
               p.tanggal_mulai, p.tanggal_selesai, p.jenis_kepesertaan, p.nama_ketua,
               -- anggota_list: daftar anggota kelompok dalam format "nama|nim;;nama|nim"
               -- dipisah ';;' antar anggota, '|' antara nama dan NIM
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
    # Mengambil semua data reward konfirmasi yang terhubung ke klaim pada periode tertentu.
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
    # Memperbarui nama dan tanggal mulai/selesai periode.
    conn = _get_conn()
    conn.execute(
        "UPDATE PERIODE_KLAIM SET nama = ?, tanggal_mulai = ?, tanggal_selesai = ? WHERE id = ?",
        (data.get("nama"), data.get("tanggal_mulai"), data.get("tanggal_selesai"), periode_id)
    )
    conn.commit()
    conn.close()
    return True


def delete_periode(periode_id: int) -> bool:
    # Menghapus periode. Tidak bisa menghapus periode yang sedang berstatus aktif.
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
    # Mengambil data klaim yang sudah disetujui untuk keperluan export ke Excel/CSV.
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
        WHERE c.status = 'sudah dicek'
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

        # Nilai dari PENGAJUAN diutamakan; fallback ke nilai di CLAIMS jika PENGAJUAN kosong.
        # Hal ini terjadi karena CLAIMS diisi saat upload sertifikat, PENGAJUAN diisi di step berikutnya.
        tahun_final    = tahun_keg or (tanggal[:4] if tanggal and len(tanggal) >= 4 else "")
        nama_keg_final = nama_keg or nama_lomba   # nama_kegiatan (PENGAJUAN) lebih lengkap dari nama_lomba (CLAIMS)
        tingkat_final  = tingkatan_p or tingkat   # tingkatan dari PENGAJUAN, fallback ke tingkat di CLAIMS
        capaian_final  = capaian or peringkat     # capaian dari PENGAJUAN, fallback ke peringkat di CLAIMS

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

        # Susun string anggota kelompok untuk kolom ekspor:
        # format: "Nama Ketua (NIM) - Ketua, Nama Anggota1 (NIM1), Nama Anggota2 (NIM2)"
        # anggota_list dari DB adalah "nama|nim;;nama|nim" — perlu di-parse terlebih dahulu
        anggota_gabung = ""
        if kepesertaan == "kelompok":
            parts = []
            if nama_ketua:
                nim_ketua = email.split("@")[0] if "@" in email else ""   # NIM ketua = bagian lokal email
                parts.append(f"{nama_ketua} ({nim_ketua}) - Ketua")
            if anggota_list:
                for entry in anggota_list.split(";;"):   # pisah antar anggota
                    if "|" in entry:
                        nama_a, nim_a = entry.split("|", 1)   # pisah nama dan NIM
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
    # Menghapus semua data di semua tabel kecuali USERS (akun operator tetap utuh).
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
    # Menghapus akun operator. Tidak bisa menghapus superadmin terakhir yang tersisa di sistem.
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
    # Memperbarui password operator dengan hash bcrypt yang baru.
    pw_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    conn = _get_conn()
    conn.execute(
        "UPDATE USERS SET password_hash = ? WHERE username = ?",
        (pw_hash, username)
    )
    conn.commit()
    conn.close()


def get_operator_by_email(email: str):
    # Mengambil data operator berdasarkan alamat email, digunakan untuk alur reset password.
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, username, nama, email, role FROM USERS WHERE email = ?",
        (email,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return dict(zip(["id", "username", "nama", "email", "role"], row))


def create_operator_otp(email: str, otp: str):
    # Menyimpan kode OTP reset password operator. OTP lama untuk email yang sama dihapus terlebih dahulu.
    from datetime import datetime, timedelta
    expired_at = (datetime.now() + timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S")
    conn = _get_conn()
    conn.execute(
        "DELETE FROM OTP_SESSIONS WHERE email = ? AND google_name = 'operator_reset'",
        (email,)
    )
    conn.execute(
        "INSERT INTO OTP_SESSIONS (email, otp, expired_at, used, google_name) VALUES (?, ?, ?, 0, 'operator_reset')",
        (email, otp, expired_at)
    )
    conn.commit()
    conn.close()


def verify_operator_otp(email: str, otp: str) -> bool:
    # Memverifikasi OTP operator dan menandainya sebagai sudah digunakan jika valid.
    from datetime import datetime
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, expired_at, used FROM OTP_SESSIONS
        WHERE email = ? AND otp = ? AND google_name = 'operator_reset'
        ORDER BY id DESC LIMIT 1
    """, (email, otp))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    otp_id, expired_at, used = row
    if used or datetime.now().strftime("%Y-%m-%d %H:%M:%S") > expired_at:
        conn.close()
        return False
    conn.execute("UPDATE OTP_SESSIONS SET used = 1 WHERE id = ?", (otp_id,))
    conn.commit()
    conn.close()
    return True
