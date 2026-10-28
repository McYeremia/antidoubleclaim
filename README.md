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
- **Visualisasi & export data** — statistik klaim per fakultas, prodi, angkatan, periode
- **Audit log** — riwayat setiap aksi operator
- **Reset password OTP** — operator dapat reset password via kode OTP ke email
- **Keamanan** — semua fitur wajib login, backend hanya bisa diakses lewat server Next.js, hak akses per data, batas upload & percobaan login (lihat [Keamanan](#keamanan))

---

## Teknologi

| Bagian | Stack |
|---|---|
| Backend | Python 3.11, FastAPI 0.135, SQLite |
| Frontend | Next.js 16.1, React 19, TailwindCSS 4 (Node.js 22) |
| Autentikasi mahasiswa | NextAuth.js + Google OAuth 2.0 |
| Autentikasi operator | Username/password + bcrypt |
| Deteksi visual | `ImageHash` 4.3 — pHash + Hamming distance |
| Deteksi teks | `RapidFuzz` 3.14 — Token Sort Ratio |
| Konversi PDF | `pdf2image` 1.17 + Poppler |
| Notifikasi email | Gmail SMTP via `smtplib` |
| Export PDF | `jspdf` + `jspdf-autotable` |
| Export Excel | `xlsx` |

> **Versi dependency dibekukan.** Semua versi di `requirements.txt` dan `frontend/package.json` / `package-lock.json` adalah versi yang dipakai saat pengujian skripsi. Jangan melakukan upgrade (termasuk `npm update` / `npm audit fix`), karena hasil pHash dan TSR bergantung pada versi library.

---

## Struktur Proyek

```
antidoubleclaim/
├── backend/
│   ├── api.py              # Semua FastAPI endpoints
│   ├── auth.py             # Kunci internal, identitas login, dan hak akses per role
│   ├── security.py         # Batas upload, validasi & pembersihan nama file, batas login/OTP
│   ├── database.py         # Schema SQLite, query, dan logika deteksi duplikat
│   ├── image_hash.py       # generate_phash(), hamming_distance()
│   ├── text_similarity.py  # token_sort_ratio() via RapidFuzz
│   ├── nim_parser.py       # Parse NIM dari email @students.ukdw.ac.id
│   ├── email_service.py    # Notifikasi email via Gmail SMTP
│   └── uploads/            # File sertifikat & dokumen yang diupload
├── frontend/
│   └── app/
│       ├── page.js                              # Landing page + login mahasiswa (Google OAuth)
│       ├── portal/page.js                       # Login operator + lupa password (OTP)
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
│       │   │       ├── SKRektor.js              # Informasi SK Rektor tentang aturan reward
│       │   │       └── shared.js               # API_URL, apiFetch, helper
│       │   ├── klaim/[id]/page.js               # Detail klaim mahasiswa
│       │   └── konfirmasi-reward/[id]/page.js   # Form konfirmasi reward versi lama (tidak ditautkan)
│       ├── operator/
│       │   ├── page.js                          # Panel operator
│       │   ├── [id]/page.js                     # Detail klaim (view operator)
│       │   ├── compare/[id]/page.js             # Perbandingan klaim yang di-flag
│       │   ├── _sidebar.js                      # Sidebar navigasi operator
│       │   └── components/
│       │       ├── ClaimSection.js              # Daftar & filter klaim
│       │       ├── PengajuanClaim.js            # Detail data pengajuan SIMKATMAWA
│       │       ├── RewardSection.js             # Manajemen reward
│       │       ├── RewardDetailModal.js         # Modal detail reward
│       │       ├── PengajuanReward.js           # Detail pengajuan reward
│       │       ├── PengaturanPeriode.js         # Kelola periode klaim
│       │       ├── ArsipPeriode.js              # Arsip periode lama
│       │       ├── ArsipDetailView.js           # Detail arsip per periode
│       │       ├── KelolaOperator.js            # Manajemen akun operator
│       │       ├── LogAktivitas.js              # Audit log aktivitas
│       │       ├── VisualisasiDataOperator.js   # Statistik & export data
│       │       └── shared.js                   # API, apiFetch, helper operator
│       └── api/
│           ├── _lib/backend.js                  # Helper perantara (identitas, CSRF, relay respons)
│           ├── backend/[...path]/route.js       # Perantara semua request data ke backend
│           ├── operator/login/route.js          # Login operator → cookie sesi httpOnly
│           ├── operator/logout/route.js         # Logout operator
│           ├── auth/[...nextauth]/route.js      # Google OAuth handler
│           └── file/route.js                    # Proxy file upload dengan cek hak akses
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
| `OPERATOR_SESI` | Sesi login operator (hash token, berlaku 3 jam) |
| `CLAIMS` | Data klaim: pHash, status deteksi, email mahasiswa, periode |
| `PENGAJUAN` | Data lengkap form SIMKATMAWA per klaim |
| `PENGAJUAN_ANGGOTA` | Daftar anggota kelompok per pengajuan |
| `REWARD_KONFIRMASI` | Data rekening & dokumen untuk pencairan reward |
| `MAHASISWA_PROFIL` | Data profil tersimpan mahasiswa (WA, rekening) |
| `PERIODE_KLAIM` | Periode pengajuan klaim (nama, tanggal, status) |
| `OTP_SESSIONS` | Kode OTP reset password operator (expire 15 menit, single-use) |
| `AUDIT_LOG` | Riwayat aksi operator (approve, tolak, ubah periode, dll.) |

Migrasi dilakukan dengan `CREATE TABLE IF NOT EXISTS` dan `ALTER TABLE ... ADD COLUMN` di `create_database()` yang dibungkus `try/except` — tidak ada migration tool terpisah.

---

## Alur Sistem

### Mahasiswa

```
Login Google OAuth (@students.ukdw.ac.id)
  → Wizard pengajuan klaim (5–6 langkah):
      1. Data diri
      2. Dosen pembimbing (+ surat tugas, opsional)
      3. Kategori SIMKATMAWA (Lomba Puspresnas / Non Puspresnas / Rekognisi)
      4. Detail kegiatan, capaian, dan dokumen (sertifikat & dokumen pendukung: PDF/JPG/PNG, maks. 3 MB)
      5. Anggota kelompok (hanya untuk kepesertaan kelompok)
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
Login username/password di /portal
  → Dashboard: filter klaim berdasarkan status
  → Detail klaim: lihat data pengajuan SIMKATMAWA + preview sertifikat
  → Jika klaim di-flag: halaman compare/[id] menampilkan dua sertifikat berdampingan
  → Approve → status "sudah dicek" + email notifikasi ke mahasiswa
  → Tolak (+ catatan) → status "ditolak" + email notifikasi ke mahasiswa
  → Kelola reward: proses → selesai / kembalikan (+ catatan) → mahasiswa revisi & resubmit
  → Kelola periode: buat → aktifkan → tutup → arsipkan
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

- Python 3.11
- Node.js 22
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

# Password awal akun superadmin "admin" saat database masih kosong.
# Default admin123 — WAJIB diganti saat deploy dengan database baru.
ADMIN_DEFAULT_PASSWORD=ganti_dengan_password_kuat

# Kunci rahasia bersama backend <-> server Next.js (wajib, minimal 32 karakter).
# Nilainya HARUS sama dengan INTERNAL_API_KEY di frontend/.env.local.
# Buat dengan: python -c "import secrets; print(secrets.token_urlsafe(48))"
INTERNAL_API_KEY=isi_dengan_string_acak_panjang
```

### 3. Jalankan Backend

```bash
# Jalankan dari root project (bukan dari dalam folder backend/)
uvicorn backend.api:app --reload
```

Backend berjalan di `http://127.0.0.1:8000`.
Database `claims.db` dibuat otomatis saat pertama kali dijalankan.
Backend hanya menerima request dari server Next.js (wajib header `X-Internal-Key`), sehingga tidak bisa dicoba langsung dari browser atau Postman. Dokumentasi otomatis `/docs` dimatikan. Backend tidak mau start jika `INTERNAL_API_KEY` atau `EMAIL_PASSWORD` kosong.

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

# Harus sama dengan INTERNAL_API_KEY di .env root
INTERNAL_API_KEY=isi_dengan_string_acak_panjang
# Alamat backend dilihat dari server Next.js (bukan dari browser)
BACKEND_INTERNAL_URL=http://127.0.0.1:8000
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

Endpoint berikut adalah endpoint backend FastAPI. Browser memanggilnya lewat perantara Next.js dengan awalan `/api/backend` (contoh: `/api/backend/claims`). Semua endpoint kecuali `GET /` wajib membawa `X-Internal-Key` (ditambahkan otomatis oleh Next.js).

Kolom **Akses**: *login* = mahasiswa atau operator, *mahasiswa*, *operator* (termasuk superadmin), *superadmin*, *publik* = tanpa login (halaman login & lupa password). Untuk mahasiswa, identitas selalu diambil dari akun yang login — parameter `email` dari browser diabaikan.

### Statistik & Profil
| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/stats/visualisasi` | login | Data statistik klaim dengan filter opsional |
| GET | `/stats/export` | operator | Data mentah klaim untuk export |
| GET | `/nim-info` | mahasiswa | Parse NIM dari email mahasiswa yang login |
| GET | `/profil` | mahasiswa | Ambil profil tersimpan milik sendiri |
| PUT | `/profil` | mahasiswa | Simpan/update profil milik sendiri |

### Periode Klaim
| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/periode` | operator | Semua periode + statistik klaim |
| POST | `/periode` | operator | Buat periode baru |
| GET | `/periode/aktif` | login | Periode yang sedang aktif hari ini |
| GET | `/periode/terkini` | login | Periode yang mencakup hari ini (berapapun statusnya) |
| PUT | `/periode/{id}` | operator | Ubah status periode |
| PATCH | `/periode/{id}` | operator | Edit data periode |
| DELETE | `/periode/{id}` | superadmin | Hapus periode |
| POST | `/periode/{id}/arsip` | superadmin | Arsipkan periode |
| GET | `/periode/{id}/claims` | operator | Klaim dalam periode tertentu |
| GET | `/periode/{id}/rewards` | operator | Reward dalam periode tertentu |

### Klaim
| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/upload` | mahasiswa | Upload sertifikat + jalankan deteksi duplikat |
| GET | `/claims` | login | Mahasiswa: klaim milik sendiri. Operator: semua klaim (`?email=` untuk filter) |
| GET | `/claims/ditolak` | operator | Semua klaim yang ditolak |
| GET | `/claims/{id}` | login | Detail klaim (pemilik, anggota kelompok, atau operator) |
| PATCH | `/claims/{id}/approve` | operator | Setujui klaim → "sudah dicek" + email |
| DELETE | `/claims/{id}` | operator | Tolak klaim → "ditolak" + email |
| GET | `/klaim-sebagai-anggota` | mahasiswa | Klaim di mana mahasiswa tercatat sebagai anggota kelompok |

### Pengajuan SIMKATMAWA
| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/pengajuan` | mahasiswa | Submit data pengajuan + dokumen (hanya untuk klaim milik sendiri) |
| GET | `/pengajuan` | mahasiswa | Daftar pengajuan milik sendiri |
| GET | `/pengajuan/by-claim/{id}` | login | Data pengajuan berdasarkan claim_id (pemilik, anggota kelompok, atau operator) |
| PATCH | `/pengajuan/{id}` | login | Edit pengajuan oleh pemilik atau operator (jika klaim belum diproses) |

### Reward Konfirmasi
| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/reward-konfirmasi` | mahasiswa | Submit data rekening + dokumen reward (pemilik klaim) |
| GET | `/reward-konfirmasi` | login | Mahasiswa: milik sendiri. Operator: semua reward (`?email=` untuk filter) |
| GET | `/reward-konfirmasi/{claim_id}` | login | Data reward berdasarkan claim_id (pemilik, anggota kelompok, atau operator) |
| PATCH | `/reward-konfirmasi/{id}/status` | operator | Update status reward + email |
| PUT | `/reward-konfirmasi/{id}` | mahasiswa | Resubmit data reward setelah dikembalikan (pemilik reward) |

### File
| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/files/{nama}` | login | Ambil file upload (pemilik, anggota kelompok klaim, atau operator). Dipanggil lewat `/api/file?name=` |

### Operator & Autentikasi
| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/` | publik | Cek status backend |
| POST | `/login-operator` | publik | Login operator (dipanggil lewat `/api/operator/login`, yang menyimpan token di cookie) |
| POST | `/operator/logout` | operator | Akhiri sesi login (dipanggil lewat `/api/operator/logout`) |
| POST | `/operator/lupa-password` | publik | Kirim OTP reset password ke email |
| POST | `/operator/reset-password` | publik | Reset password dengan OTP |
| GET | `/operators` | superadmin | Daftar semua operator |
| POST | `/operators` | superadmin | Buat akun operator baru |
| PATCH | `/operators/{id}/password` | operator | Ubah password sendiri; superadmin dapat mengubah milik operator lain |
| DELETE | `/operators/{id}` | superadmin | Hapus akun operator |
| GET | `/audit-log` | superadmin | Riwayat aksi operator |
| POST | `/admin/reset-data` | superadmin | Hapus semua data kecuali USERS |

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

Ganti password akun `admin` segera setelah login pertama.

---

## Keamanan

**Arsitektur akses.** Browser tidak memanggil backend secara langsung. Semua request lewat route Next.js `/api/backend/*`, yang:
- memeriksa session Google (mahasiswa) atau cookie sesi operator (`adc_op`, httpOnly),
- membuang header identitas yang dikirim browser dan menolak request pengubah data dari situs lain (CSRF),
- meneruskan identitas yang sudah diverifikasi ke backend bersama kunci rahasia `X-Internal-Key`.

Backend menolak semua request tanpa kunci tersebut (kecuali `GET /`), lalu mengecek hak akses per endpoint: mahasiswa hanya bisa mengakses data miliknya sendiri (atau melihat klaim kelompok di mana ia tercatat sebagai anggota), operator mengakses semua data, dan fitur tertentu khusus superadmin.

**Sesi operator.** Login menghasilkan token sesi acak yang berlaku 3 jam (yang disimpan di database hanya hash-nya). Logout serta ganti/reset password mengakhiri sesi. Salah password 5 kali → username dikunci 15 menit. Kode OTP reset password: maksimal 3 permintaan per 15 menit dan hangus setelah 5 kali salah.

**Upload file.**
- Hanya PDF, JPG, dan PNG (dicek dari ekstensi dan isi file), maksimal 3 MB per file dan 25 MB per request.
- Nama file dibersihkan sebelum disimpan; file tidak bisa diakses publik.
- Batas jumlah upload per akun, batas proses pHash bersamaan, batas dimensi gambar/halaman PDF, dan cek sisa ruang disk.

**Lainnya.** Security header (`X-Frame-Options: SAMEORIGIN`, `nosniff`, `Referrer-Policy`), pesan error server tidak membocorkan detail teknis, dan export CSV aman dari formula injection.

Semua batas dapat diatur lewat `.env` (lihat `backend/security.py`): `MAX_REQUEST_MB`, `UPLOAD_RATE_LIMIT`, `UPLOAD_RATE_WINDOW_SEC`, `MAX_CONCURRENT_HASH`, `HASH_QUEUE_TIMEOUT_SEC`, `MIN_FREE_DISK_MB`, `LOGIN_MAKS_GAGAL`, `LOGIN_KUNCI_DETIK`, `OTP_MAKS_GAGAL`, `OTP_MAKS_PERMINTAAN`, `OTP_PERMINTAAN_DETIK`.

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

- **File upload**: Disimpan di `backend/uploads/` dengan nama `{prefix}_{uuid}_{nama_asli}` (nama asli dibersihkan dari karakter berbahaya). File tidak bisa diakses publik: frontend mengambilnya lewat proxy Next.js `GET /api/file?name=`, yang meneruskan ke endpoint backend `GET /files/{nama}` dengan pengecekan hak akses (pemilik, anggota kelompok klaim, atau operator).
- **Migrasi database**: Dilakukan inline dengan `ALTER TABLE ... ADD COLUMN` dibungkus `try/except`. Tidak ada tool migrasi terpisah.
- **Email notifikasi**: Dikirim sebagai background task FastAPI agar tidak memblokir response API.
- **PDF sertifikat**: Hanya halaman pertama yang dirender (200 DPI) untuk dihitung pHash-nya.
