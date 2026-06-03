# Antidoubleclaim

Sistem deteksi klaim sertifikat ganda untuk mahasiswa **Universitas Kristen Duta Wacana (UKDW)**. Mahasiswa mengajukan sertifikat prestasi; sistem mendeteksi duplikasi secara otomatis menggunakan **pHash + Hamming distance** (kemiripan visual) dan **Token Sort Ratio / TSR** (kemiripan nama kegiatan), lalu operator memverifikasi dan memproses reward.

Dibangun sebagai bagian dari skripsi di UKDW.

---

## Fitur Utama

- **Deteksi duplikat otomatis** — kombinasi pHash (gambar) dan TSR (teks nama lomba)
- **Wizard pengajuan multi-step** — mahasiswa mengisi data SIMKATMAWA secara bertahap
- **Manajemen periode klaim** — operator membuka/menutup periode, mengarsipkan data lama
- **Alur reward** — konfirmasi data rekening oleh mahasiswa, diproses oleh operator
- **Notifikasi email otomatis** — saat klaim disetujui/ditolak dan reward diproses/selesai
- **Simulator deteksi** — operator dapat menguji cara kerja pHash dan TSR secara interaktif
- **Visualisasi & export data** — statistik klaim per fakultas, prodi, angkatan, periode
- **Audit log** — riwayat setiap aksi operator
- **Reset password OTP** — operator dapat reset password via kode OTP ke email

---

## Teknologi

| Bagian | Stack |
|---|---|
| Backend | Python 3, FastAPI 0.135, SQLite |
| Frontend | Next.js 16.1, React 19, TailwindCSS 4 |
| Autentikasi mahasiswa | NextAuth.js + Google OAuth 2.0 |
| Autentikasi operator | Username/password + bcrypt |
| Deteksi visual | `ImageHash` 4.3 — pHash + Hamming distance |
| Deteksi teks | `RapidFuzz` 3.14 — Token Sort Ratio |
| Konversi PDF | `pdf2image` 1.17 + Poppler |
| Notifikasi email | Gmail SMTP via `smtplib` |
| Export PDF | `jspdf` + `jspdf-autotable` |
| Export Excel | `xlsx` |

---

## Struktur Proyek

```
antidoubleclaim/
├── backend/
│   ├── api.py              # Semua FastAPI endpoints
│   ├── database.py         # Schema SQLite, query, dan logika deteksi duplikat
│   ├── image_hash.py       # generate_phash(), hamming_distance()
│   ├── text_similarity.py  # token_sort_ratio() via RapidFuzz
│   ├── nim_parser.py       # Parse NIM dari email @students.ukdw.ac.id
│   ├── email_service.py    # Notifikasi email via Gmail SMTP
│   └── uploads/            # File sertifikat & dokumen yang diupload
├── frontend/
│   └── app/
│       ├── page.js                              # Landing page
│       ├── portal/page.js                       # Login mahasiswa (Google OAuth)
│       ├── mahasiswa/
│       │   ├── dashboard/
│       │   │   ├── page.js                      # Panel utama mahasiswa
│       │   │   ├── TambahKlaimWizard.js         # Wizard pengajuan klaim (multi-step)
│       │   │   ├── KonfirmasiRewardFormPanel.js # Form konfirmasi data rekening
│       │   │   └── components/
│       │   │       ├── DaftarKlaim.js           # Daftar klaim mahasiswa
│       │   │       ├── KonfirmasiReward.js      # Status reward
│       │   │       ├── ProfilPanel.js           # Profil & data rekening
│       │   │       ├── VisualisasiData.js       # Grafik statistik mahasiswa
│       │   │       ├── SKRektor.js              # Generator SK Rektor PDF
│       │   │       └── shared.js               # API_URL, apiFetch, helper
│       │   ├── klaim/[id]/page.js               # Detail klaim mahasiswa
│       │   └── konfirmasi-reward/[id]/page.js   # Form konfirmasi reward
│       ├── operator/
│       │   ├── page.js                          # Login + panel operator
│       │   ├── [id]/page.js                     # Detail klaim (view operator)
│       │   ├── compare/[id]/page.js             # Perbandingan klaim yang di-flag
│       │   ├── _sidebar.js                      # Sidebar navigasi operator
│       │   └── components/
│       │       ├── ClaimSection.js              # Daftar & filter klaim
│       │       ├── PengajuanClaim.js            # Detail data pengajuan SIMKATMAWA
│       │       ├── RewardSection.js             # Manajemen reward
│       │       ├── RewardDetailModal.js         # Modal detail reward
│       │       ├── PengajuanReward.js           # Detail pengajuan reward
│       │       ├── SimulatorDeteksi.js          # Tool uji pHash & TSR
│       │       ├── PengaturanPeriode.js         # Kelola periode klaim
│       │       ├── ArsipPeriode.js              # Arsip periode lama
│       │       ├── ArsipDetailView.js           # Detail arsip per periode
│       │       ├── KelolaOperator.js            # Manajemen akun operator
│       │       ├── LogAktivitas.js              # Audit log aktivitas
│       │       ├── VisualisasiDataOperator.js   # Statistik & export data
│       │       └── shared.js                   # API, apiFetch, helper operator
│       └── api/
│           ├── auth/[...nextauth]/route.js      # Google OAuth handler
│           └── file/route.js                    # Proxy file upload (hindari CORS)
├── claims.db               # Database SQLite (auto-generated saat backend start)
├── requirements.txt        # Dependensi Python
└── README.md
```

---

## Database

Tabel di `claims.db` dan relasinya:

| Tabel | Isi |
|---|---|
| `USERS` | Akun operator/superadmin (username, password bcrypt, role) |
| `CLAIMS` | Data klaim: pHash, status deteksi, email mahasiswa, periode |
| `PENGAJUAN` | Data lengkap form SIMKATMAWA per klaim |
| `PENGAJUAN_ANGGOTA` | Daftar anggota kelompok per pengajuan |
| `REWARD_KONFIRMASI` | Data rekening & dokumen untuk pencairan reward |
| `MAHASISWA_PROFIL` | Data profil tersimpan mahasiswa (WA, rekening) |
| `PERIODE_KLAIM` | Periode pengajuan klaim (nama, tanggal, status) |
| `OTP_SESSIONS` | Kode OTP reset password operator (expire 15 menit, single-use) |
| `AUDIT_LOG` | Riwayat aksi operator (approve, tolak, ubah periode, dll.) |

Migrasi dilakukan dengan `ALTER TABLE ... ADD COLUMN` di `create_database()` yang dibungkus `try/except` — tidak ada migration tool terpisah.

---

## Alur Sistem

### Mahasiswa

```
Login Google OAuth (@students.ukdw.ac.id)
  → Wizard pengajuan klaim (6 langkah):
      1. Kategori SIMKATMAWA (Lomba / Rekognisi)
      2. Data kegiatan & peringkat/capaian
      3. Data kepesertaan & anggota
      4. Upload sertifikat
      5. Data pengajuan tambahan (dokumen, dospem, dll.)
      6. Konfirmasi & kirim
  → Backend menjalankan deteksi duplikat otomatis
      ├─ Mirip → status "perlu ditinjau"
      └─ Tidak mirip → status "belum dicek"
  → Setelah klaim disetujui operator:
      → Mahasiswa mengisi form Konfirmasi Reward (data rekening, KTM, KTP, dll.)
      → Operator memproses reward → notifikasi email ke mahasiswa
```

### Operator

```
Login username/password
  → Dashboard: filter klaim berdasarkan status
  → Detail klaim: lihat data pengajuan SIMKATMAWA + preview sertifikat
  → Jika klaim di-flag: halaman compare/[id] menampilkan dua sertifikat berdampingan
  → Approve → status "sudah dicek" + email notifikasi ke mahasiswa
  → Tolak (+ catatan) → status "ditolak" + email notifikasi ke mahasiswa
  → Kelola reward: proses → selesai / kembalikan (+ catatan) → mahasiswa revisi & resubmit
  → Kelola periode: buat → aktifkan → tutup → arsipkan
  → Simulator: uji cara kerja pHash dan TSR secara interaktif
  → Visualisasi: grafik klaim per fakultas/prodi/angkatan/kategori + export Excel/PDF
```

---

## Logika Deteksi Duplikat

Threshold yang digunakan:

| Algoritma | Threshold | Arti |
|---|---|---|
| pHash Hamming distance | ≤ 10 | Gambar dianggap mirip secara visual |
| TSR (Token Sort Ratio) | ≥ 80 | Nama kegiatan dianggap mirip |

Kedua nilai ini terdapat di `backend/database.py`: `PHASH_THRESHOLD = 10`, `FUZZY_THRESHOLD = 80`.

**Alur deteksi** (dijalankan saat upload sertifikat):

1. Hitung pHash sertifikat baru
2. Bandingkan dengan semua klaim aktif (status bukan `ditolak`) dalam **kategori yang sama**
   - `lomba_mandiri_puspresnas` dan `lomba_mandiri_non_puspresnas` dikelompokkan bersama
   - `rekognisi` hanya dibandingkan dengan sesama rekognisi
3. Untuk setiap klaim lama, cek dua kondisi:
   - **pHash mirip**: Hamming distance ≤ 10
   - **Nama mirip**: TSR score ≥ 80
4. Jika salah satu atau keduanya mirip **DAN** peringkat/capaian sama → klaim di-flag `perlu ditinjau`
5. Jika mirip tapi peringkat berbeda → tidak di-flag
6. Kolom `flag_alasan` mencatat penyebab: `"gambar"`, `"nama"`, atau `"gambar, nama"`

Klaim yang ditolak dikecualikan dari perbandingan sehingga mahasiswa bisa mengajukan ulang.

---

## Status Flow

**Klaim:**
```
belum dicek  →  perlu ditinjau  →  sudah dicek
     └─────────────────────────→  ditolak
```

**Reward:**
```
menunggu  →  diproses  →  selesai
              └──────→  dikembalikan  →  (mahasiswa perbaiki)  →  menunggu
```

**Periode:**
```
tutup  →  aktif  →  ditutup  →  diarsipkan
```

---

## Setup & Menjalankan

### Prasyarat

- Python 3.10+
- Node.js 18+
- [Poppler](https://github.com/oschwartz10612/poppler-windows/releases/) (untuk konversi PDF → gambar)
- Akun Google Cloud Console dengan OAuth 2.0 credentials (Web Application)
- Akun Gmail dengan App Password untuk notifikasi email

### 1. Klon & Install Backend

```bash
# Buat dan aktifkan virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/Mac

# Install semua dependensi
pip install -r requirements.txt
```

### 2. Konfigurasi `.env` (root project)

Buat file `.env` di root project:

```env
# Gmail SMTP — gunakan App Password, bukan password akun
EMAIL_SENDER=email_pengirim@gmail.com
EMAIL_PASSWORD=xxxx_xxxx_xxxx_xxxx

# Path ke folder bin Poppler
POPPLER_PATH=C:\poppler\Library\bin

# Password awal akun superadmin (opsional, default: admin123)
ADMIN_DEFAULT_PASSWORD=admin123
```

### 3. Jalankan Backend

```bash
# Jalankan dari root project (bukan dari dalam folder backend/)
uvicorn backend.api:app --reload
```

Backend berjalan di `http://127.0.0.1:8000`.
Database `claims.db` dibuat otomatis saat pertama kali dijalankan.
Dokumentasi API interaktif tersedia di `http://127.0.0.1:8000/docs`.

### 4. Install & Konfigurasi Frontend

```bash
cd frontend
npm install
```

Buat file `frontend/.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=isi_dengan_string_acak_panjang

GOOGLE_CLIENT_ID=isi_dari_google_console
GOOGLE_CLIENT_SECRET=isi_dari_google_console

NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Authorized redirect URI yang didaftarkan di Google Console:
```
http://localhost:3000/api/auth/callback/google
```

### 5. Jalankan Frontend

```bash
npm run dev
```

Frontend berjalan di `http://localhost:3000`.

---

## API Endpoints

### Simulator
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/simulator/phash` | Hitung & bandingkan pHash dua gambar (in-memory, tidak disimpan) |
| POST | `/simulator/fuzzy` | Hitung skor TSR dua string judul |

### Statistik & Profil
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/stats/visualisasi` | Data statistik klaim dengan filter opsional |
| GET | `/stats/export` | Data mentah klaim untuk export |
| GET | `/nim-info?email=` | Parse NIM dari email mahasiswa |
| GET | `/profil?email=` | Ambil profil tersimpan mahasiswa |
| PUT | `/profil?email=` | Simpan/update profil mahasiswa |

### Periode Klaim
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/periode` | Semua periode + statistik klaim |
| POST | `/periode` | Buat periode baru (operator) |
| GET | `/periode/aktif` | Periode yang sedang aktif hari ini |
| GET | `/periode/terkini` | Periode yang mencakup hari ini (berapapun statusnya) |
| PUT | `/periode/{id}` | Ubah status periode (operator) |
| PATCH | `/periode/{id}` | Edit data periode (operator) |
| DELETE | `/periode/{id}` | Hapus periode (superadmin) |
| POST | `/periode/{id}/arsip` | Arsipkan periode (superadmin) |
| GET | `/periode/{id}/claims` | Klaim dalam periode tertentu |
| GET | `/periode/{id}/rewards` | Reward dalam periode tertentu |

### Klaim
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/upload` | Upload sertifikat + jalankan deteksi duplikat |
| GET | `/claims` | Semua klaim; `?email=` untuk filter per mahasiswa |
| GET | `/claims/ditolak` | Semua klaim yang ditolak |
| GET | `/claims/{id}` | Detail satu klaim |
| PATCH | `/claims/{id}/approve` | Setujui klaim → "sudah dicek" + email (operator) |
| DELETE | `/claims/{id}` | Tolak klaim → "ditolak" + email (operator) |
| GET | `/klaim-sebagai-anggota?email=` | Klaim di mana mahasiswa sebagai anggota |

### Pengajuan SIMKATMAWA
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/pengajuan` | Submit data pengajuan + dokumen |
| GET | `/pengajuan?email=` | Daftar pengajuan per mahasiswa |
| GET | `/pengajuan/by-claim/{id}` | Data pengajuan berdasarkan claim_id |
| PATCH | `/pengajuan/{id}` | Edit pengajuan (jika klaim belum diproses) |

### Reward Konfirmasi
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/reward-konfirmasi` | Submit data rekening + dokumen reward |
| GET | `/reward-konfirmasi` | Semua reward; `?email=` untuk filter |
| GET | `/reward-konfirmasi/{claim_id}` | Data reward berdasarkan claim_id |
| PATCH | `/reward-konfirmasi/{id}/status` | Update status reward + email (operator) |
| PUT | `/reward-konfirmasi/{id}` | Resubmit data reward setelah dikembalikan |

### Operator & Autentikasi
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/login-operator` | Login operator |
| POST | `/operator/lupa-password` | Kirim OTP reset password ke email |
| POST | `/operator/reset-password` | Reset password dengan OTP |
| GET | `/operators` | Daftar semua operator (superadmin) |
| POST | `/operators` | Buat akun operator baru (superadmin) |
| PATCH | `/operators/{id}/password` | Ubah password operator |
| DELETE | `/operators/{id}` | Hapus akun operator (superadmin) |
| GET | `/audit-log` | Riwayat aksi operator (superadmin) |
| POST | `/admin/reset-data` | Hapus semua data kecuali USERS (superadmin) |

---

## Akun

| Role | Cara Login | Keterangan |
|---|---|---|
| Mahasiswa | Google OAuth | Hanya email `@students.ukdw.ac.id` |
| Operator | Username/password | Akses umum: kelola klaim dan reward |
| Superadmin | Username/password | Akses penuh: kelola operator, periode, audit log, reset data |

Akun superadmin default dibuat otomatis saat backend pertama kali dijalankan:
- **Username**: `admin`
- **Password**: nilai `ADMIN_DEFAULT_PASSWORD` di `.env` (default: `admin123`)

Autentikasi API menggunakan header `X-Operator-ID: <id>` pada setiap request dari frontend operator.

---

## Format NIM UKDW

NIM mahasiswa UKDW: 8 digit dengan format `FPAAXXXX`

| Posisi | Arti |
|---|---|
| `F` | Kode Fakultas |
| `P` | Kode Prodi |
| `AA` | Dua digit terakhir tahun angkatan (contoh: `22` → 2022) |
| `XXXX` | Nomor urut mahasiswa |

Contoh: `71220001` → Fakultas Teknologi Informasi / Informatika / Angkatan 2022 / No. 0001

Digunakan untuk memfilter visualisasi data berdasarkan fakultas, prodi, dan angkatan.

---

## Catatan Teknis

- **File upload**: Disimpan di `backend/uploads/` dengan nama `{prefix}_{uuid}_{nama_asli}`. Frontend mengakses file lewat proxy Next.js `GET /api/file?name=` untuk menghindari CORS/ngrok blocking.
- **Migrasi database**: Dilakukan inline dengan `ALTER TABLE ... ADD COLUMN` dibungkus `try/except`. Tidak ada tool migrasi terpisah.
- **Email notifikasi**: Dikirim sebagai background task FastAPI agar tidak memblokir response API.
- **Simulator**: Endpoint `/simulator/*` memproses gambar in-memory dan tidak menyimpan apapun ke database atau disk.
