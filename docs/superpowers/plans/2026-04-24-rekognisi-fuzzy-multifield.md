# Deteksi Double Claim Rekognisi — Fuzzy Multi-Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan deteksi duplikat khusus rekognisi yang membandingkan fuzzy nama kegiatan + exact kategori kegiatan, menggantikan pHash yang tidak efektif untuk dokumen rekognisi.

**Architecture:** Karena wizard sudah memetakan `peringkat = kategori_kegiatan` untuk rekognisi (lihat TambahKlaimWizard.js baris 1360), CLAIMS table sudah menyimpan kategori sebagai `peringkat`. Cukup tambah satu param `kategori_simkatmawa` ke `insert_claim` untuk memilih cabang deteksi yang tepat — tanpa perlu JOIN PENGAJUAN atau mengubah schema.

**Tech Stack:** Python (RapidFuzz sudah terinstall via `text_similarity.py`), FastAPI Form fields, Next.js FormData.

---

## File Map

| File | Aksi | Tanggung Jawab |
|------|------|----------------|
| `backend/database.py` | Modify | Tambah param `kategori_simkatmawa` ke `insert_claim`; branch rekognisi vs lomba |
| `backend/api.py` | Modify | Tambah field opsional `kategori_simkatmawa` ke endpoint `/upload` |
| `frontend/app/mahasiswa/dashboard/TambahKlaimWizard.js` | Modify | Kirim `kategori_simkatmawa` di upload FormData |

---

## Task 1: Branch deteksi di `insert_claim` (database.py)

**Files:**
- Modify: `backend/database.py` baris 290–371 (fungsi `insert_claim`)

### Penjelasan logika

Untuk rekognisi, wizard sudah memetakan:
- `uploadPayload["nama_lomba"]` = `data.nama_kegiatan` → tersimpan di `CLAIMS.nama_lomba`
- `uploadPayload["peringkat"]` = `data.kategori_kegiatan` → tersimpan di `CLAIMS.peringkat`

Sehingga deteksi rekognisi cukup:
1. `token_sort_ratio(nama_lomba_baru, old_nama_lomba) >= 80` (fuzzy nama kegiatan)
2. `peringkat_baru == old_peringkat` (exact kategori — "Juri/Pelatih/Wasit" tidak akan cocok dengan "Juara 1")

Tidak perlu JOIN PENGAJUAN karena data sudah ada di CLAIMS.

- [ ] **Step 1: Ubah signature `insert_claim` — tambah parameter `kategori_simkatmawa`**

Cari baris definisi fungsi `insert_claim` (baris 290):
```python
def insert_claim(nama_lomba, tingkat, tanggal, peringkat, sertifikat_path,
                 mahasiswa_email="placeholder@students.ukdw.ac.id",
                 nama_display="Mahasiswa"):
```
Ganti dengan:
```python
def insert_claim(nama_lomba, tingkat, tanggal, peringkat, sertifikat_path,
                 mahasiswa_email="placeholder@students.ukdw.ac.id",
                 nama_display="Mahasiswa",
                 kategori_simkatmawa=None):
```

- [ ] **Step 2: Ganti seluruh blok deteksi (for loop) dengan cabang rekognisi vs lomba**

Cari blok ini (baris 300–340):
```python
    # Bandingkan dengan klaim aktif (exclude ditolak agar mahasiswa bisa re-submit)
    cursor.execute("SELECT id, nama_lomba, peringkat, phash FROM CLAIMS WHERE status != 'ditolak'")
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
```

Ganti seluruh blok tersebut dengan:
```python
    # Bandingkan dengan klaim aktif (exclude ditolak agar mahasiswa bisa re-submit)
    cursor.execute("SELECT id, nama_lomba, peringkat, phash FROM CLAIMS WHERE status != 'ditolak'")
    rows = cursor.fetchall()

    flagged         = False
    mirip_dengan_id = None
    detail          = {}

    is_rekognisi = (kategori_simkatmawa == "rekognisi")

    for row in rows:
        old_id, old_nama, old_peringkat, old_phash_str = row

        if is_rekognisi:
            # Rekognisi: fuzzy nama kegiatan + exact kategori (tersimpan di peringkat)
            sim_nama   = token_sort_ratio(nama_lomba, old_nama)
            nama_mirip = sim_nama >= FUZZY_THRESHOLD
            print(f"[Rekognisi] vs ID {old_id}: similarity nama={sim_nama}% → {'MIRIP' if nama_mirip else 'aman'}")

            if nama_mirip and peringkat == old_peringkat:
                flagged         = True
                mirip_dengan_id = old_id
                detail          = {
                    "duplikat_dengan_id": old_id,
                    "similarity_nama":    sim_nama,
                    "distance_phash":     None,
                    "flag_alasan":        "nama kegiatan + kategori rekognisi",
                }
                print(f"[FLAGGED] Rekognisi mirip dengan ID {old_id} — nama mirip ({sim_nama}%), kategori sama ({peringkat})")
                break
        else:
            # Lomba: pHash + fuzzy nama + peringkat (logika existing)
            sim_nama   = token_sort_ratio(nama_lomba, old_nama)
            nama_mirip = sim_nama >= FUZZY_THRESHOLD
            print(f"[Tahap 1] vs ID {old_id}: similarity nama={sim_nama}% (threshold={FUZZY_THRESHOLD}) → {'MIRIP' if nama_mirip else 'aman'}")

            old_hash    = imagehash.hex_to_hash(old_phash_str)
            distance    = int(hamming_distance(new_hash, old_hash))
            phash_mirip = distance <= PHASH_THRESHOLD
            print(f"[Tahap 2] vs ID {old_id}: Hamming distance={distance} (threshold={PHASH_THRESHOLD}) → {'MIRIP' if phash_mirip else 'aman'}")

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
```

- [ ] **Step 3: Verifikasi import berjalan**

```
venv\Scripts\python -c "from backend.database import insert_claim; print('OK')"
```
Expected: `OK`

---

## Task 2: Tambah field `kategori_simkatmawa` ke endpoint `/upload` (api.py)

**Files:**
- Modify: `backend/api.py` baris 272–307 (endpoint `POST /upload`)

- [ ] **Step 1: Tambah parameter opsional ke endpoint**

Cari definisi endpoint `/upload` (baris 272):
```python
@app.post("/upload")
async def upload_certificate(
    nama_lomba: str = Form(...),
    tingkat: str = Form(...),
    tanggal: str = Form(...),
    peringkat: str = Form(...),
    mahasiswa_email: str = Form(...),
    nama_display: str = Form(...),
    file: UploadFile = File(...)
):
```
Ganti dengan:
```python
@app.post("/upload")
async def upload_certificate(
    nama_lomba: str = Form(...),
    tingkat: str = Form(...),
    tanggal: str = Form(...),
    peringkat: str = Form(...),
    mahasiswa_email: str = Form(...),
    nama_display: str = Form(...),
    file: UploadFile = File(...),
    kategori_simkatmawa: Optional[str] = Form(None),
):
```

- [ ] **Step 2: Teruskan ke `insert_claim`**

Cari baris pemanggilan `insert_claim` (baris 295):
```python
        result = insert_claim(nama_lomba, tingkat, tanggal, peringkat, file_location,
                              mahasiswa_email=mahasiswa_email, nama_display=nama_display)
```
Ganti dengan:
```python
        result = insert_claim(nama_lomba, tingkat, tanggal, peringkat, file_location,
                              mahasiswa_email=mahasiswa_email, nama_display=nama_display,
                              kategori_simkatmawa=kategori_simkatmawa)
```

- [ ] **Step 3: Verifikasi backend bisa diload**

```
venv\Scripts\python -c "from backend.api import app; print('OK')"
```
Expected: `OK`

---

## Task 3: Kirim `kategori_simkatmawa` di upload FormData (TambahKlaimWizard.js)

**Files:**
- Modify: `frontend/app/mahasiswa/dashboard/TambahKlaimWizard.js` baris 1356–1365

- [ ] **Step 1: Tambah field ke uploadPayload**

Cari blok `uploadPayload` (baris 1356):
```js
      const uploadPayload = new FormData();
      uploadPayload.append("nama_lomba",      data.nama_kegiatan);
      uploadPayload.append("tingkat",         isLomba ? data.kategori_kegiatan : data.tingkatan);
      uploadPayload.append("tanggal",         data.tanggal_selesai || data.tahun_kegiatan);
      uploadPayload.append("peringkat",       isLomba ? data.capaian           : data.kategori_kegiatan);
      uploadPayload.append("mahasiswa_email", session.user.email);
      uploadPayload.append("nama_display",    session.user.name ?? session.user.email);
      uploadPayload.append("file",            files.dokumen_sertifikat);
```
Ganti dengan:
```js
      const uploadPayload = new FormData();
      uploadPayload.append("nama_lomba",           data.nama_kegiatan);
      uploadPayload.append("tingkat",              isLomba ? data.kategori_kegiatan : data.tingkatan);
      uploadPayload.append("tanggal",              data.tanggal_selesai || data.tahun_kegiatan);
      uploadPayload.append("peringkat",            isLomba ? data.capaian : data.kategori_kegiatan);
      uploadPayload.append("mahasiswa_email",      session.user.email);
      uploadPayload.append("nama_display",         session.user.name ?? session.user.email);
      uploadPayload.append("kategori_simkatmawa",  data.kategori_simkatmawa ?? "");
      uploadPayload.append("file",                 files.dokumen_sertifikat);
```

- [ ] **Step 2: Verifikasi `isLomba` sudah terdefinisi di scope yang sama**

Cari baris definisi `isLomba` di wizard. Pastikan ia terdefinisi sebelum baris `uploadPayload`:
```
grep -n "isLomba" frontend/app/mahasiswa/dashboard/TambahKlaimWizard.js
```
Expected: ada baris `const isLomba = isLombaMandiri(data.kategori_simkatmawa)` atau sejenisnya di atas baris 1356.

---

## Task 4: Test manual end-to-end

- [ ] **Step 1: Jalankan backend**
```
venv\Scripts\python -m uvicorn backend.api:app --reload
```

- [ ] **Step 2: Jalankan frontend**
```
cd frontend && npm run dev
```

- [ ] **Step 3: Skenario — Rekognisi duplikat terdeteksi**

1. Login sebagai mahasiswa A → tambah klaim rekognisi kategori **"Juri/Pelatih/Wasit"** dengan nama kegiatan **"Lomba Robotik UKDW 2024"** → submit
2. Login sebagai mahasiswa B → tambah klaim rekognisi kategori **"Juri/Pelatih/Wasit"** dengan nama kegiatan **"Lomba Robotik UKDW 2024"** → submit
3. **Expected:** Klaim B berstatus `perlu ditinjau`, `flag_alasan = "nama kegiatan + kategori rekognisi"`

- [ ] **Step 4: Skenario — Rekognisi kategori berbeda tidak di-flag**

1. Mahasiswa C → rekognisi kategori **"Pemakalah/Speaker"** nama kegiatan **"Lomba Robotik UKDW 2024"** → submit
2. **Expected:** Klaim C berstatus `belum dicek` (kategori berbeda → tidak di-flag)

- [ ] **Step 5: Skenario — Lomba mandiri tidak terdampak**

1. Submit klaim lomba mandiri seperti biasa
2. **Expected:** Deteksi berjalan dengan pHash + nama lomba + peringkat, tidak ada perubahan perilaku
