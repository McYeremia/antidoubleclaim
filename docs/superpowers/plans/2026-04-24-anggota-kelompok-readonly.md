# Anggota Kelompok Read-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anggota kelompok yang NIM-nya diinputkan ketua dapat melihat klaim kelompok di dashboard mereka secara read-only tanpa perubahan schema database.

**Architecture:** Backend menambah 1 endpoint baru yang derivasi NIM dari email login lalu query PENGAJUAN_ANGGOTA→PENGAJUAN→CLAIMS. Frontend fetch endpoint baru paralel dengan fetch existing, merge hasilnya, dan tandai klaim anggota dengan flag `is_anggota` untuk memblokir aksi edit/reward.

**Tech Stack:** Python FastAPI (backend), Next.js 15 + React 19 (frontend), SQLite via modul database.py custom.

---

## File Map

| File | Aksi | Tanggung Jawab |
|------|------|----------------|
| `backend/database.py` | Modify | Tambah fungsi `get_klaim_sebagai_anggota(nim)` |
| `backend/api.py` | Modify | Import fungsi baru + tambah endpoint `GET /klaim-sebagai-anggota` |
| `frontend/app/mahasiswa/dashboard/components/DaftarKlaim.js` | Modify | Fetch paralel, merge list, blokir aksi untuk klaim anggota |
| `frontend/app/mahasiswa/klaim/[id]/page.js` | Modify | Baca `?readonly=true`, sembunyikan tombol edit |

---

## Task 1: Fungsi database `get_klaim_sebagai_anggota`

**Files:**
- Modify: `backend/database.py` (setelah fungsi `get_pengajuan_by_claim_id`, sekitar baris 562)

- [ ] **Step 1: Tambah fungsi ke database.py**

Buka `backend/database.py`. Cari baris tepat setelah penutup fungsi `get_pengajuan_by_claim_id` (baris `return dict(zip(cols, row))` yang kedua, sekitar baris 562). Tambahkan fungsi baru di bawahnya:

```python
def get_klaim_sebagai_anggota(nim: str) -> list:
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, p.id AS pengajuan_id
        FROM PENGAJUAN_ANGGOTA pa
        JOIN PENGAJUAN p ON pa.pengajuan_id = p.id
        JOIN CLAIMS c ON p.claim_id = c.id
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
```

- [ ] **Step 2: Verifikasi manual fungsi bisa dipanggil**

Jalankan Python di root project:
```bash
cd "C:\01. Kuliah\Semester 8\01. Skripsi\antidoubleclaim"
python -c "from backend.database import get_klaim_sebagai_anggota; print(get_klaim_sebagai_anggota('99999999'))"
```
Expected output: `[]` (list kosong, tidak error)

- [ ] **Step 3: Commit**

```bash
git add backend/database.py
git commit -m "feat: tambah fungsi get_klaim_sebagai_anggota di database"
```

---

## Task 2: Endpoint API `GET /klaim-sebagai-anggota`

**Files:**
- Modify: `backend/api.py`

- [ ] **Step 1: Import fungsi baru di api.py**

Buka `backend/api.py`. Cari baris import dari `backend.database` (sekitar baris 12-29). Tambahkan `get_klaim_sebagai_anggota` ke dalam import tersebut:

```python
from backend.database import (
    insert_claim, create_database,
    get_all_claims, get_claims_by_email, get_claim_by_id,
    approve_claim, reject_claim, get_ditolak_claims,
    insert_pengajuan, get_pengajuan_by_email, get_pengajuan_by_claim_id,
    get_pengajuan_by_id, update_pengajuan,
    insert_reward_konfirmasi, get_reward_konfirmasi_by_claim_id,
    get_reward_konfirmasi_by_email, update_reward_status, update_reward_konfirmasi,
    authenticate_operator, get_all_operators, get_operator_by_id,
    create_operator, delete_operator,
    get_stats_visualisasi, get_export_data,
    get_profil_mahasiswa, upsert_profil_mahasiswa,
    insert_audit_log, get_audit_log,
    get_periode_aktif, get_periode_terkini, get_all_periode, create_periode,
    update_periode_status, update_periode_data, delete_periode, reset_semua_data,
    arsipkan_periode, get_claims_by_periode_id, get_rewards_by_periode_id,
    get_reward_konfirmasi_by_id,
    get_klaim_sebagai_anggota,
)
```

- [ ] **Step 2: Tambah endpoint di api.py**

Cari endpoint `@app.get("/claims")` atau endpoint mahasiswa lain di `api.py`. Tambahkan endpoint baru setelah blok endpoint `/claims`:

```python
@app.get("/klaim-sebagai-anggota")
async def klaim_sebagai_anggota(email: str):
    from backend.nim_parser import is_valid_student_email
    if not is_valid_student_email(email):
        return []
    nim = email.split("@")[0]
    return get_klaim_sebagai_anggota(nim)
```

- [ ] **Step 3: Test endpoint dengan curl**

Jalankan backend terlebih dahulu (di terminal terpisah):
```bash
cd "C:\01. Kuliah\Semester 8\01. Skripsi\antidoubleclaim"
python -m uvicorn backend.api:app --reload
```

Lalu test endpoint:
```bash
curl "http://127.0.0.1:8000/klaim-sebagai-anggota?email=99999999@students.ukdw.ac.id"
```
Expected output: `[]`

```bash
curl "http://127.0.0.1:8000/klaim-sebagai-anggota?email=bukan-email-valid"
```
Expected output: `[]`

- [ ] **Step 4: Commit**

```bash
git add backend/api.py
git commit -m "feat: tambah endpoint GET /klaim-sebagai-anggota"
```

---

## Task 3: DaftarKlaim — fetch paralel + merge + blokir aksi anggota

**Files:**
- Modify: `frontend/app/mahasiswa/dashboard/components/DaftarKlaim.js`

- [ ] **Step 1: Update fungsi fetchClaims untuk fetch paralel**

Buka `DaftarKlaim.js`. Cari fungsi `fetchClaims` (sekitar baris 21). Ganti seluruh fungsi tersebut dengan:

```js
const fetchClaims = async () => {
  setLoading(true);
  try {
    const [claimRes, rewardRes, pengajuanRes, anggotaRes] = await Promise.all([
      fetch(`${API_URL}/claims?email=${encodeURIComponent(session.user.email)}`),
      fetch(`${API_URL}/reward-konfirmasi?email=${encodeURIComponent(session.user.email)}`),
      fetch(`${API_URL}/pengajuan?email=${encodeURIComponent(session.user.email)}`),
      fetch(`${API_URL}/klaim-sebagai-anggota?email=${encodeURIComponent(session.user.email)}`),
    ]);
    const claimData     = claimRes.ok     ? await claimRes.json()    : [];
    const rewardData    = rewardRes.ok    ? await rewardRes.json()   : [];
    const pengajuanData = pengajuanRes.ok ? await pengajuanRes.json(): [];
    const anggotaData   = anggotaRes.ok   ? await anggotaRes.json()  : [];

    // Merge: klaim sendiri + klaim sebagai anggota, hindari duplikat by id
    const ownIds = new Set(claimData.map(c => c.id));
    const merged = [
      ...claimData,
      ...anggotaData.filter(c => !ownIds.has(c.id)),
    ];
    setClaims(merged);

    const map = {};
    rewardData.forEach(r => { map[r.claim_id] = r; });
    setRewardMap(map);

    const pMap = {};
    pengajuanData.forEach(p => { if (p.claim_id) pMap[p.claim_id] = p; });
    setPengajuanMap(pMap);
  } catch {
    setClaims([]);
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 2: Update logika klik baris tabel untuk klaim anggota**

Cari baris di tabel yang berisi `onClick={() => router.push("/mahasiswa/klaim/" + claim.id)}` (sekitar baris 141). Ganti baris `<tr key=...` tersebut dengan:

```jsx
<tr key={claim.id}
    onClick={() => {
      const isAnggota = claim.mahasiswa_email !== session.user.email;
      const url = isAnggota
        ? `/mahasiswa/klaim/${claim.id}?readonly=true`
        : `/mahasiswa/klaim/${claim.id}`;
      router.push(url);
    }}
    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors">
```

- [ ] **Step 3: Sembunyikan tombol "Isi Data Reward" untuk klaim anggota**

Cari blok `<td ... onClick={(e) => e.stopPropagation()}>` di dalam baris tabel (sekitar baris 159). Ganti isi `<td>` tersebut dengan:

```jsx
<td className="px-5 py-4 text-[13px]" onClick={(e) => e.stopPropagation()}>
  {claim.status === "sudah dicek" && claim.mahasiswa_email === session.user.email && (
    rewardMap[claim.id] ? (
      <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold ${REWARD_STYLE[rewardMap[claim.id].reward_status] ?? "bg-gray-100 text-gray-600"}`}>
        {REWARD_LABEL[rewardMap[claim.id].reward_status] ?? rewardMap[claim.id].reward_status}
      </span>
    ) : (
      <button
        onClick={() => onOpenForm?.(claim.id)}
        className="text-[13px] font-semibold text-[#046137] hover:text-[#035230] transition-colors underline underline-offset-2"
      >
        Isi Data Reward
      </button>
    )
  )}
  {claim.status === "sudah dicek" && claim.mahasiswa_email !== session.user.email && rewardMap[claim.id] && (
    <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold ${REWARD_STYLE[rewardMap[claim.id].reward_status] ?? "bg-gray-100 text-gray-600"}`}>
      {REWARD_LABEL[rewardMap[claim.id].reward_status] ?? rewardMap[claim.id].reward_status}
    </span>
  )}
</td>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/mahasiswa/dashboard/components/DaftarKlaim.js
git commit -m "feat: DaftarKlaim merge klaim anggota kelompok dan blokir aksi edit"
```

---

## Task 4: Halaman Detail Klaim — blokir edit jika readonly

**Files:**
- Modify: `frontend/app/mahasiswa/klaim/[id]/page.js`

- [ ] **Step 1: Import useSearchParams**

Buka `frontend/app/mahasiswa/klaim/[id]/page.js`. Cari baris import (baris 1-6):

```js
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
```

Ganti dengan:

```js
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
```

- [ ] **Step 2: Baca searchParams di dalam komponen**

Cari baris `const { id } = useParams();` (sekitar baris 145). Tambahkan baris baru di bawahnya:

```js
const searchParams = useSearchParams();
const isReadonly   = searchParams.get("readonly") === "true";
```

- [ ] **Step 3: Terapkan isReadonly ke logika canEdit**

Cari baris yang mendefinisikan `canEdit` (sekitar baris 204):

```js
const canEdit = pengajuan && (claim.status === "belum dicek" || claim.status === "perlu ditinjau");
```

Ganti dengan:

```js
const canEdit = !isReadonly && pengajuan && (claim.status === "belum dicek" || claim.status === "perlu ditinjau");
```

- [ ] **Step 4: Verifikasi tidak ada perubahan lain yang diperlukan**

Baca kembali file `klaim/[id]/page.js`. Tombol EDIT DATA sudah dikontrol oleh `canEdit && (...)` pada baris ~488:
```jsx
) : canEdit && (
  <button onClick={openEdit} ...>
    EDIT DATA
  </button>
)}
```
Karena `canEdit` sudah `false` saat `isReadonly=true`, tombol otomatis tersembunyi. Tidak ada perubahan tambahan.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/mahasiswa/klaim/[id]/page.js
git commit -m "feat: halaman detail klaim blokir edit jika dibuka sebagai anggota (readonly)"
```

---

## Task 5: Test end-to-end manual

- [ ] **Step 1: Jalankan backend**

```bash
cd "C:\01. Kuliah\Semester 8\01. Skripsi\antidoubleclaim"
python -m uvicorn backend.api:app --reload
```

- [ ] **Step 2: Jalankan frontend**

```bash
cd "C:\01. Kuliah\Semester 8\01. Skripsi\antidoubleclaim\frontend"
npm run dev
```

- [ ] **Step 3: Skenario uji — Anggota melihat klaim kelompok**

1. Login sebagai mahasiswa A (ketua) → buat klaim kelompok → isi NIM mahasiswa B sebagai anggota
2. Logout → login sebagai mahasiswa B (anggota)
3. Buka Dashboard → Daftar Klaim
4. **Expected:** Klaim kelompok milik A muncul di list mahasiswa B
5. Klik klaim tersebut
6. **Expected:** URL berisi `?readonly=true`, tombol EDIT DATA tidak muncul, tombol Isi Data Reward tidak muncul
7. **Expected:** Semua data (status, detail kegiatan, anggota, timeline) tampil normal

- [ ] **Step 4: Skenario uji — Ketua tidak terdampak**

1. Login sebagai mahasiswa A (ketua)
2. Buka klaim kelompok yang dibuat sendiri
3. **Expected:** URL tanpa `?readonly=true`, tombol EDIT DATA muncul (jika status belum dicek/perlu ditinjau)
4. **Expected:** Tombol Isi Data Reward muncul (jika status sudah dicek dan belum ada reward)

- [ ] **Step 5: Skenario uji — Anggota dengan klaim pribadi sekaligus**

1. Login sebagai mahasiswa B yang punya klaim pribadi DAN terdaftar sebagai anggota kelompok
2. **Expected:** Kedua klaim muncul di list
3. Klik klaim pribadi → URL normal, bisa edit
4. Klik klaim kelompok → URL `?readonly=true`, tidak bisa edit
