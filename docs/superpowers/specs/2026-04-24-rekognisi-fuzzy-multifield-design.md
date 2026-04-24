# Design: Deteksi Double Claim Rekognisi — Fuzzy Multi-Field

**Tanggal:** 2026-04-24  
**Status:** Approved  
**Pendekatan:** A — Tambah field rekognisi ke `/upload`, deteksi di `insert_claim`

---

## Ringkasan

Menambahkan logika deteksi duplikat khusus untuk klaim kategori **rekognisi non-lomba**. Deteksi berlaku lintas semua mahasiswa menggunakan fuzzy matching pada nama kegiatan + exact match pada kategori kegiatan. Klaim lomba mandiri tidak terpengaruh — tetap menggunakan pHash + nama lomba + peringkat.

---

## Latar Belakang

Deteksi duplikat yang ada saat ini menggunakan:
1. pHash gambar sertifikat (Hamming distance ≤ 10)
2. Fuzzy nama lomba (token_sort_ratio ≥ 80)
3. Jika salah satu mirip **dan** peringkat sama → flag

Untuk rekognisi, pendekatan ini tidak efektif karena:
- Sertifikat rekognisi sangat beragam bentuknya (pHash tidak reliable)
- Tidak ada konsep "peringkat" yang meaningful
- Yang relevan adalah: nama kegiatan + jenis peran/kategori

**Constraint arsitektur:** `insert_claim` berjalan **sebelum** `insert_pengajuan`. Data rekognisi (kategori_kegiatan, nama_kegiatan) harus diteruskan dari frontend ke endpoint `/upload` agar tersedia saat deteksi.

---

## Alur Deteksi Baru

```
insert_claim dipanggil
        ↓
Cek kategori_simkatmawa
    ├── 'rekognisi' → Deteksi Rekognisi (multi-field fuzzy)
    └── lainnya     → Deteksi Lomba (existing, tidak berubah)
```

### Deteksi Rekognisi

Query semua klaim rekognisi aktif yang sudah punya PENGAJUAN:
```sql
SELECT c.id, p.nama_kegiatan, p.kategori_kegiatan
FROM CLAIMS c
JOIN PENGAJUAN p ON p.claim_id = c.id
WHERE p.kategori_simkatmawa = 'rekognisi'
  AND c.status != 'ditolak'
```

Untuk setiap baris, flag jika **kedua** kondisi terpenuhi:
1. `kategori_kegiatan == old_kategori_kegiatan` — exact match (berbeda kategori = beda aktivitas)
2. `token_sort_ratio(nama_kegiatan, old_nama_kegiatan) >= 80` — nama event cukup mirip

Jika flagged:
- `status = 'perlu ditinjau'`
- `flag_alasan = 'nama kegiatan + kategori rekognisi'`
- `mirip_dengan_id = old_id`

pHash tetap digenerate dan disimpan (untuk preview sertifikat di halaman detail), tapi **tidak digunakan untuk perbandingan** pada rekognisi.

---

## Komponen yang Diubah

| File | Perubahan |
|---|---|
| `backend/database.py::insert_claim` | Terima 3 param opsional baru; branch rekognisi vs lomba; tambah query deteksi rekognisi |
| `backend/api.py::/upload` | Tambah 3 field opsional di Form: `kategori_simkatmawa`, `kategori_kegiatan`, `nama_kegiatan` |
| `frontend/.../TambahKlaimWizard.js` | Kirim 3 field tambahan ke FormData saat upload |

## Komponen yang Tidak Diubah

- Logika deteksi lomba mandiri (pHash + fuzzy nama + peringkat)
- Schema database (tidak ada migrasi)
- Tabel CLAIMS, PENGAJUAN, trigger status
- Halaman operator, tampilan flag, email notifikasi
- Threshold fuzzy (tetap 80)

---

## Edge Cases

| Kondisi | Perilaku |
|---|---|
| Upload rekognisi tanpa `kategori_kegiatan` di form | `kategori_simkatmawa` = None → cabang lomba dijalankan (fallback aman) |
| Klaim rekognisi lama belum punya PENGAJUAN (claim_id NULL) | Tidak ikut di-JOIN, tidak dibandingkan |
| Kategori sama, nama event berbeda jauh | Tidak di-flag (fuzzy < 80) |
| Kategori berbeda, nama event sangat mirip | Tidak di-flag (exact kategori gagal) |
| Flagged: operator review, ternyata beda orang di event sama | Operator approve manual — by design |
