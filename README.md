# Anti-Double Claim

Sistem pencatatan dan deteksi klaim sertifikat ganda untuk mahasiswa berbasis **perceptual hashing (pHash)** dan **fuzzy string matching**. Dibangun sebagai bagian dari skripsi di Universitas Kristen Duta Wacana (UKDW).

---

## Deskripsi Sistem

Mahasiswa mengajukan klaim prestasi (lomba mandiri / rekognisi non-lomba) beserta dokumen pendukung melalui form multi-step. Sistem mendeteksi secara otomatis apakah sertifikat yang diunggah memiliki kemiripan visual dengan sertifikat yang sudah ada di database. Operator kemudian meninjau dan memverifikasi klaim.

### Alur Sistem

```
Mahasiswa login (Google OAuth — @students.ukdw.ac.id)
  → Mengisi form multi-step pengajuan klaim (6 langkah)
  → Upload sertifikat → pHash detection otomatis
      ├─ Mirip (distance ≤ 10) + peringkat sama  → status "perlu ditinjau"
      └─ Tidak mirip / peringkat beda             → status "belum dicek"
  → Data tersimpan di CLAIMS (deteksi) + PENGAJUAN (data lengkap)

Operator login (password)
  → Dashboard: lihat semua klaim berdasarkan status
  → Detail klaim: data lengkap pengajuan + preview sertifikat
  → Approve → status "sudah dicek"
  → Discard → klaim dihapus
```

---

## Teknologi

| Bagian | Stack |
|---|---|
| Backend | Python 3, FastAPI, SQLite |
| Frontend | Next.js 16, Tailwind CSS |
| Autentikasi | NextAuth.js + Google OAuth 2.0 |
| Deteksi Visual | `imagehash` (pHash + Hamming distance) |
| Deteksi Teks | `RapidFuzz` (fuzzy string matching) |

---

## Struktur Proyek

```
antidoubleclaim/
├── backend/
│   ├── api.py              # FastAPI endpoints
│   ├── database.py         # Operasi SQLite (CLAIMS, PENGAJUAN, dll.)
│   ├── image_hash.py       # Generate & bandingkan pHash
│   ├── text_similarity.py  # Fuzzy string matching (RapidFuzz)
│   └── nim_parser.py       # Parse NIM dari email @students.ukdw.ac.id
├── frontend/
│   ├── app/
│   │   ├── page.js                         # Halaman login
│   │   ├── layout.js                       # Root layout + SessionProvider
│   │   ├── providers.js                    # NextAuth SessionProvider wrapper
│   │   ├── auth-error/page.js              # Halaman error autentikasi
│   │   ├── mahasiswa/
│   │   │   └── dashboard/
│   │   │       ├── page.js                 # Dashboard mahasiswa
│   │   │       └── TambahKlaimWizard.js    # Form multi-step pengajuan klaim
│   │   ├── operator/
│   │   │   ├── page.js                     # Dashboard operator
│   │   │   └── [id]/page.js                # Detail klaim operator
│   │   └── api/auth/[...nextauth]/
│   │       └── route.js                    # Konfigurasi NextAuth + Google
│   ├── .env.local                          # Kredensial OAuth (tidak di-commit)
│   └── package.json
├── claims.db               # Database SQLite (auto-generated)
├── requirements.txt
└── README.md
```

---

## Database

Tabel di `claims.db`:

| Tabel | Isi |
|---|---|
| `CLAIMS` | Data klaim untuk deteksi double (pHash, status, email mahasiswa) |
| `PENGAJUAN` | Data lengkap form multi-step (semua field pengajuan) |
| `PENGAJUAN_ANGGOTA` | Data anggota kelompok per pengajuan |
| `USERS` | Akun operator |
| `OTP_SESSIONS` | Sesi OTP (reserved) |

`PENGAJUAN.claim_id` → FK ke `CLAIMS.id` (menghubungkan kedua tabel).

---

## Setup & Menjalankan

### Prasyarat

- Python 3.10+
- Node.js 18+
- Virtual environment Python
- Akun Google Cloud Console dengan OAuth 2.0 credentials (Web Application)

### 1. Backend

```bash
# Buat dan aktifkan virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/Mac

# Install dependencies
pip install fastapi uvicorn python-multipart imagehash pillow rapidfuzz

# Jalankan dari root folder
uvicorn backend.api:app --reload
```

Backend berjalan di `http://127.0.0.1:8000`.  
Database `claims.db` dibuat otomatis saat backend pertama kali dijalankan.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di `http://localhost:3000`.

### 3. Konfigurasi `frontend/.env.local`

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=isi_dengan_string_acak
GOOGLE_CLIENT_ID=isi_dengan_client_id_dari_google_console
GOOGLE_CLIENT_SECRET=isi_dengan_client_secret_dari_google_console
```

Google OAuth hanya mengizinkan login dari email `@students.ukdw.ac.id`.  
Authorized redirect URI yang perlu didaftarkan di Google Console:
```
http://localhost:3000/api/auth/callback/google
```

---

## API Endpoints

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/` | Health check |
| GET | `/nim-info?email=` | Parse NIM dari email mahasiswa |
| POST | `/upload` | Upload sertifikat + deteksi double claim |
| GET | `/claims` | Semua klaim (opsional: `?email=` untuk filter per mahasiswa) |
| GET | `/claims/{id}` | Detail satu klaim |
| PATCH | `/claims/{id}/approve` | Setujui klaim → status "sudah dicek" |
| DELETE | `/claims/{id}` | Hapus klaim |
| POST | `/pengajuan` | Simpan data pengajuan lengkap |
| GET | `/pengajuan?email=` | Daftar pengajuan per mahasiswa |
| GET | `/pengajuan/by-claim/{id}` | Data pengajuan berdasarkan claim_id |

---

## Akun

| Role | Cara Login | Keterangan |
|---|---|---|
| Mahasiswa | Google OAuth | Hanya email `@students.ukdw.ac.id` |
| Operator | Password | Default: `operator` |

---

## Format NIM UKDW

NIM mahasiswa UKDW: 8 digit dengan format `FPAAXXXX`

| Posisi | Arti |
|---|---|
| F | Kode Fakultas (1=Bisnis, 3=Bioteknologi, 4=Kedokteran, 6=Arsitektur, 7=FTI, 8=Humaniora) |
| P | Kode Prodi |
| AA | Dua digit terakhir tahun angkatan (contoh: `22` → 2022) |
| XXXX | Nomor urut mahasiswa |

Contoh: `71220001` → FTI / Informatika / Angkatan 2022 / No. 0001

---

## Logika Deteksi Double Claim

1. Sertifikat baru di-upload → generate **pHash** (perceptual hash 64-bit)
2. Bandingkan dengan semua klaim lama menggunakan **Hamming distance**
3. Jika `distance ≤ 10` **dan** `peringkat sama` → status **"perlu ditinjau"**
4. Jika `distance ≤ 10` tapi `peringkat berbeda` → status **"belum dicek"**
5. Jika `distance > 10` → status **"belum dicek"**

Status yang dilihat mahasiswa disederhanakan:
- `belum dicek` / `perlu ditinjau` → **"Dalam Proses"**
- `sudah dicek` → **"Selesai"**
