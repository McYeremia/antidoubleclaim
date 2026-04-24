# Design: Koneksi Anggota Kelompok ke Klaim Ketua (Read-Only)

**Tanggal:** 2026-04-24  
**Status:** Approved  
**Pendekatan:** A — Derive NIM dari email saat query (tanpa perubahan schema)

---

## Ringkasan

Anggota kelompok yang NIM-nya diinputkan oleh ketua saat pengajuan dapat melihat klaim kelompok tersebut di dashboard mereka sendiri. Tampilan identik dengan ketua, tetapi semua aksi edit/input diblokir (read-only). Tidak ada perubahan schema database.

---

## Latar Belakang

- Email mahasiswa UKDW berformat `{NIM}@students.ukdw.ac.id`, sehingga NIM dapat diderivasi langsung dari email dan sebaliknya.
- `PENGAJUAN_ANGGOTA` sudah menyimpan `nim_anggota` — cukup untuk mengidentifikasi anggota yang login.
- Ketua adalah mahasiswa yang `mahasiswa_email`-nya cocok dengan email login; anggota adalah mahasiswa yang `nim_anggota`-nya cocok dengan NIM dari email login.

---

## Arsitektur

### Backend

**Endpoint baru:** `GET /klaim-sebagai-anggota?email={email}`

Alur:
1. Validasi format email via `is_valid_student_email()` (sudah ada di `nim_parser.py`)
2. Extract NIM: `nim = email.split("@")[0]`
3. Query:
```sql
SELECT p.claim_id, c.*, p.id AS pengajuan_id
FROM PENGAJUAN_ANGGOTA pa
JOIN PENGAJUAN p ON pa.pengajuan_id = p.id
JOIN CLAIMS c ON p.claim_id = c.id
WHERE pa.nim_anggota = ?
  AND p.claim_id IS NOT NULL
```
4. Return list dengan field tambahan `is_anggota: true`

**Tidak ada perubahan pada:**
- Schema database (nol migrasi)
- Endpoint upload/pengajuan existing
- Logika deteksi duplikat

### Frontend

**`DaftarKlaim.js`** — fetch 2 endpoint paralel saat mount:
1. `/pengajuan?email=...` → klaim milik sendiri (existing)
2. `/klaim-sebagai-anggota?email=...` → klaim sebagai anggota (baru)

Merge hasilnya menjadi 1 list. Penentu role:
```js
const isKetua = claim.mahasiswa_email === session.user.email;
```

Saat navigasi ke detail:
- Ketua → `/mahasiswa/klaim/[id]` (normal)
- Anggota → `/mahasiswa/klaim/[id]?readonly=true`

**`klaim/[id]/page.js`** — cek query param `readonly`:
- Jika `true`: sembunyikan tombol edit, tombol konfirmasi reward, tombol hapus
- Seluruh konten (status, detail, data kelompok) tetap tampil

---

## Data Flow

```
Anggota login (Google OAuth)
        ↓
Dashboard fetch paralel:
  [A] GET /pengajuan?email=...              → klaim milik sendiri
  [B] GET /klaim-sebagai-anggota?email=...  → klaim kelompok
        ↓
Merge list, render semua klaim
        ↓
User klik klaim:
  - claim.mahasiswa_email === session.email → navigasi normal (ketua)
  - selainnya                               → navigasi dengan ?readonly=true
        ↓
Halaman detail cek ?readonly=true
  → sembunyikan semua tombol aksi
  → tampilkan semua data read-only
```

---

## Edge Cases

| Kondisi | Perilaku |
|---|---|
| Anggota belum punya klaim sendiri | Hanya tampil klaim kelompok (read-only) |
| Anggota juga punya klaim pribadi | Keduanya muncul; klaim pribadi bisa diedit |
| NIM tidak valid / bukan domain UKDW | Endpoint return `[]`, tidak error |
| `claim_id` di PENGAJUAN masih NULL | Difilter oleh `p.claim_id IS NOT NULL`, tidak muncul |
| Anggota terdaftar di >1 klaim kelompok | Semua muncul, semua read-only |

---

## Komponen yang Diubah

| File | Perubahan |
|---|---|
| `backend/api.py` | Tambah endpoint `GET /klaim-sebagai-anggota` |
| `backend/database.py` | Tambah fungsi `get_klaim_sebagai_anggota(nim)` |
| `frontend/app/mahasiswa/dashboard/components/DaftarKlaim.js` | Fetch paralel + merge list + logika ketua/anggota |
| `frontend/app/mahasiswa/klaim/[id]/page.js` | Baca `?readonly=true`, sembunyikan aksi edit |

## Komponen yang Tidak Diubah

- Schema database (tidak ada migrasi)
- `TambahKlaimWizard.js`
- Halaman dan komponen operator
- Logika deteksi duplikat
- Endpoint upload/pengajuan existing
