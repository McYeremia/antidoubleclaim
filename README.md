# Anti-Double Claim

Sistem deteksi klaim sertifikat ganda untuk mencegah mahasiswa mengklaim hadiah/penghargaan yang sama lebih dari satu kali.

## Latar Belakang

Dalam proses klaim hadiah kompetisi oleh mahasiswa, terdapat potensi kecurangan berupa pengklaiman sertifikat yang sama lebih dari satu kali (double claim). Sistem ini dirancang untuk mendeteksi hal tersebut secara otomatis melalui dua tahap verifikasi: kesamaan teks metadata dan kesamaan visual sertifikat.

## Aktor

| Aktor | Peran |
|---|---|
| **Mahasiswa (User)** | Mengajukan klaim lomba beserta sertifikat |
| **Operator** | Mengecek dan memvalidasi klaim yang masuk |

## Alur Kerja (MVP)

```
Mahasiswa input klaim
        │
        ▼
[TAHAP 1] Fuzzy String Matching
Cek kesamaan nama lomba & atribut metadata
(nama lomba, tingkat, tanggal, peringkat)
        │
        ├─ Tidak mirip ──► Status: AMAN
        │
        └─ Mirip ─────────► Tandai sementara
                                    │
                                    ▼
                    [TAHAP 2] Perceptual Hash (pHash)
                    Bandingkan hash visual sertifikat
                    menggunakan Hamming distance
                                    │
                           ┌────────┴────────┐
                           ▼                 ▼
                      DUPLIKAT           AMAN
               (distance ≤ threshold)
```

## Teknologi

**Backend**
- Python + FastAPI
- SQLite (database lokal)
- `imagehash` — generate perceptual hash (pHash) dari gambar sertifikat
- `pdf2image` + Poppler — konversi PDF ke gambar sebelum di-hash
- `RapidFuzz` — fuzzy string matching untuk perbandingan metadata teks

**Frontend**
- Next.js (React)
- Tailwind CSS

## Struktur Proyek

```
antidoubleclaim/
├── backend/
│   ├── api.py              # REST API endpoint (FastAPI)
│   ├── database.py         # Logika penyimpanan & deteksi duplikat
│   ├── image_hash.py       # Generate pHash & Hamming distance
│   └── text_similarity.py  # Fuzzy string matching (RapidFuzz)
├── frontend/
│   └── app/
│       ├── layout.js
│       └── page.js         # Form upload klaim
├── claims.db               # Database SQLite
├── requirements.txt
└── README.md
```

## Cara Menjalankan

### Prasyarat
- Python 3.10+
- Node.js 18+
- [Poppler](https://github.com/oschwartz10612/poppler-windows/releases/) (untuk konversi PDF), ekstrak ke `C:\poppler\`

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Jalankan server
uvicorn backend.api:app --reload
```

Server berjalan di `http://127.0.0.1:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`

## API Endpoint

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/` | Cek status backend |
| `POST` | `/upload` | Upload klaim sertifikat |

### POST `/upload`

**Form Data:**

| Field | Tipe | Keterangan |
|---|---|---|
| `nama_lomba` | string | Nama kompetisi |
| `tingkat` | string | Universitas / Provinsi / Nasional / Internasional |
| `tanggal` | string | Tanggal sertifikat (YYYY-MM-DD) |
| `peringkat` | string | Contoh: Juara 1, Finalis |
| `file` | file | File sertifikat (.jpg, .jpeg, .png, .pdf) |

**Response:**

```json
{
  "message": "Upload berhasil dan data telah dianalisis",
  "status": "aman" | "duplikat",
  "distance": null | <integer>
}
```

## Logika Deteksi

### Tahap 1 — Fuzzy String Matching
Menggunakan `token_sort_ratio` dari RapidFuzz untuk membandingkan nama lomba dan atribut lainnya. Nilai similarity dihitung dalam skala 0–100.

### Tahap 2 — Perceptual Hash (pHash)
Sertifikat dikonversi menjadi hash 64-bit menggunakan algoritma pHash. Dua sertifikat dianggap duplikat jika **Hamming distance ≤ 10** (threshold dapat dikonfigurasi).
