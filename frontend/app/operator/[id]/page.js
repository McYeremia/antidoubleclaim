"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const STATUS_STYLE = {
  "belum dicek":    "bg-blue-100 text-blue-800",
  "perlu ditinjau": "bg-yellow-100 text-yellow-800",
  "sudah dicek":    "bg-green-100 text-green-800",
};

// ── Konstanta pilihan (sinkron dengan TambahKlaimWizard) ──────────────────────
const TAHUN_INI = new Date().getFullYear();
const OPT_TAHUN = [String(TAHUN_INI), String(TAHUN_INI - 1), String(TAHUN_INI - 2)];

const OPT_KATEGORI_SIMKATMAWA = [
  { value: "lomba_mandiri", label: "Lomba Mandiri" },
  { value: "rekognisi",     label: "Rekognisi Non-Lomba" },
];
const OPT_JENIS_KEPESERTAAN = [
  { value: "individu", label: "Individu" },
  { value: "kelompok", label: "Kelompok" },
];
const OPT_ADA_DOSPEM = [
  { value: "ya",    label: "Ya" },
  { value: "tidak", label: "Tidak" },
];
const OPT_KATEGORI_LOMBA   = ["Provinsi / Wilayah", "Nasional", "Internasional"];
const OPT_TINGKATAN        = ["Internasional", "Nasional", "Provinsi"];
const OPT_MODEL_PELAKSANAAN = ["Online", "Offline"];
const OPT_CAPAIAN = [
  "Juara 1", "Juara 2", "Juara 3",
  "Harapan 1", "Harapan 2", "Harapan 3",
  "Apresiasi kejuaraan / Penghargaan tambahan / Juara umum",
  "Partisipasi / Delegasi / Peserta kejuaraan",
];
const OPT_KATEGORI_REKOGNISI = [
  "Karya Mahasiswa berupa teknologi tepat guna/seni budaya/produk kreatif untuk UMKM dan Industri",
  "Juri/Pelatih/Wasit",
  "Pemakalah/Speaker pada Conference/Seminar Ilmiah",
  "Narasumber pada kegiatan/seminar",
  "Peserta pameran karya seni",
  "Penulisan ISBN",
  "Paten/Paten Sederhana",
  "Publikasi jurnal nasional Sinta 1 dan 2 dan/atau internasional bereputasi sebagai penulis pertama",
  "Tuan rumah kejuaraan/kompetisi mandiri",
];
const OPT_JENIS_KARYA = ["Teknologi Tepat Guna", "Seni Budaya", "Produk Kreatif"];

// ── Helper ────────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-1.5 mb-3">{children}</h3>;
}

function CertPreview({ url, filename }) {
  if (!url || !filename) return null;
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  return isPdf
    ? <iframe src={url} className="w-full h-64 rounded border border-gray-200" title="Preview" />
    : <img src={url} alt="Preview" className="w-full rounded border border-gray-200 object-contain max-h-64" />;
}

function FileLink({ label, path }) {
  if (!path) return null;
  const filename = path.split(/[\\/]/).pop();
  const url = `http://127.0.0.1:8000/uploads/${filename}`;
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <a href={url} target="_blank" rel="noopener noreferrer"
         className="text-sm text-blue-600 hover:underline mt-0.5 inline-block">
        {filename} ↗
      </a>
    </div>
  );
}

// ── Helper input untuk mode edit ─────────────────────────────────────────────
function EditInput({ label, name, value, onChange, type = "text", span2 = false }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <input
        type={type}
        value={value ?? ""}
        onChange={e => onChange(name, e.target.value)}
        className="block w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function EditSelect({ label, name, value, onChange, options, span2 = false }) {
  // options bisa berupa string[] atau {value, label}[]
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <select
        value={value ?? ""}
        onChange={e => onChange(name, e.target.value)}
        className="block w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">— pilih —</option>
        {options.map(o => {
          const val = typeof o === "object" ? o.value : o;
          const lbl = typeof o === "object" ? o.label : o;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
    </div>
  );
}

// ── Blok data pengajuan lengkap ───────────────────────────────────────────────
function PengajuanDetail({ p, onSaved }) {
  const [editing, setEditing]   = useState(false);
  const [form,    setForm]      = useState({});
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);

  if (!p) return null;

  const isLomba    = (editing ? form.kategori_simkatmawa : p.kategori_simkatmawa) === "lomba_mandiri";
  const isKarya    = (editing ? form.kategori_kegiatan   : p.kategori_kegiatan)?.startsWith("Karya Mahasiswa");
  const isKelompok = (editing ? form.jenis_kepesertaan   : p.jenis_kepesertaan)  === "kelompok";

  const anggota = p.anggota_list
    ? p.anggota_list.split(";;").map(s => { const [nama, nim] = s.split("|"); return { nama, nim }; })
    : [];

  const startEdit = () => {
    setForm({ ...p });
    setEditing(true);
    setSaved(false);
  };

  const cancelEdit = () => setEditing(false);

  const set = (name, value) => setForm(f => ({ ...f, [name]: value }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form };
    delete payload.anggota_list;
    delete payload.id;
    delete payload.mahasiswa_email;
    delete payload.created_at;
    delete payload.claim_id;
    delete payload.setuju;
    // hanya kirim field yang berubah
    const changed = {};
    for (const k of Object.keys(payload)) {
      if (payload[k] !== p[k]) changed[k] = payload[k] === "" ? null : payload[k];
    }
    if (Object.keys(changed).length === 0) { setEditing(false); setSaving(false); return; }
    await fetch(`http://127.0.0.1:8000/pengajuan/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changed),
    });
    setSaving(false);
    setEditing(false);
    setSaved(true);
    onSaved?.();
  };

  const d = editing ? form : p;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-700">Data Pengajuan Lengkap</h2>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600 font-medium">Tersimpan</span>}
          {editing ? (
            <>
              <button onClick={cancelEdit}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </>
          ) : (
            <button onClick={startEdit}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Data
            </button>
          )}
        </div>
      </div>

      {/* Data Mahasiswa */}
      <div>
        <SectionTitle>Data Mahasiswa</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <EditInput label="Nama"     name="nama_display" value={d.nama_display} onChange={set} />
              <InfoRow   label="Email"    value={p.mahasiswa_email} />
              <EditInput label="Nomor WA" name="nomor_wa"     value={d.nomor_wa}     onChange={set} />
            </>
          ) : (
            <>
              <InfoRow label="Nama"     value={p.nama_display} />
              <InfoRow label="Email"    value={p.mahasiswa_email} />
              <InfoRow label="Nomor WA" value={p.nomor_wa} />
            </>
          )}
        </div>
      </div>

      {/* Dosen Pembimbing */}
      <div>
        <SectionTitle>Dosen Pembimbing</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <EditSelect label="Menggunakan Dospem" name="ada_dospem" value={d.ada_dospem}
                options={OPT_ADA_DOSPEM} onChange={set} />
              {d.ada_dospem === "ya" &&
                <EditInput label="NIK/NIDN/NIDK" name="nidn_dospem" value={d.nidn_dospem} onChange={set} />}
            </>
          ) : (
            <>
              <InfoRow label="Menggunakan Dospem" value={p.ada_dospem === "ya" ? "Ya" : "Tidak"} />
              {p.ada_dospem === "ya" && <InfoRow label="NIK/NIDN/NIDK" value={p.nidn_dospem} />}
            </>
          )}
        </div>
        <div className="mt-3">
          <FileLink label="Surat Tugas Dospem" path={p.surat_tugas_path} />
        </div>
      </div>

      {/* Detail Kegiatan */}
      <div>
        <SectionTitle>Detail Kegiatan</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <EditSelect label="Kategori SIMKATMAWA" name="kategori_simkatmawa"
                value={d.kategori_simkatmawa} options={OPT_KATEGORI_SIMKATMAWA} onChange={set} />
              <EditSelect label="Jenis Kepesertaan" name="jenis_kepesertaan"
                value={d.jenis_kepesertaan} options={OPT_JENIS_KEPESERTAAN} onChange={set} />
              <EditInput label="Nama Kegiatan" name="nama_kegiatan" value={d.nama_kegiatan} onChange={set} span2 />
              <EditSelect label="Kategori Kegiatan" name="kategori_kegiatan"
                value={d.kategori_kegiatan}
                options={isLomba ? OPT_KATEGORI_LOMBA : OPT_KATEGORI_REKOGNISI}
                onChange={set} span2 />
              {!isLomba && <EditSelect label="Tingkatan" name="tingkatan"
                value={d.tingkatan} options={OPT_TINGKATAN} onChange={set} />}
              <EditSelect label="Tahun Kegiatan" name="tahun_kegiatan"
                value={d.tahun_kegiatan} options={OPT_TAHUN} onChange={set} />
              {isLomba && <>
                <EditSelect label="Model Pelaksanaan" name="model_pelaksanaan"
                  value={d.model_pelaksanaan} options={OPT_MODEL_PELAKSANAAN} onChange={set} />
                <EditInput label="Jumlah Peserta" name="jumlah_peserta"
                  value={d.jumlah_peserta} onChange={set} type="number" />
                <EditSelect label="Capaian" name="capaian"
                  value={d.capaian} options={OPT_CAPAIAN} onChange={set} />
                <EditInput label="Tanggal Mulai"   name="tanggal_mulai"
                  value={d.tanggal_mulai}   onChange={set} type="date" />
                <EditInput label="Tanggal Selesai" name="tanggal_selesai"
                  value={d.tanggal_selesai} onChange={set} type="date" />
              </>}
              <EditInput label="URL Penyelenggara" name="url_penyelenggara"
                value={d.url_penyelenggara} onChange={set} span2 />
              <EditInput label="Keterangan" name="keterangan"
                value={d.keterangan} onChange={set} span2 />
            </>
          ) : (
            <>
              <InfoRow label="Kategori SIMKATMAWA"
                value={isLomba ? "Lomba Mandiri" : "Rekognisi Non-Lomba"} />
              <InfoRow label="Jenis Kepesertaan"  value={p.jenis_kepesertaan} />
              <InfoRow label="Nama Kegiatan"      value={p.nama_kegiatan} />
              <InfoRow label="Kategori Kegiatan"  value={p.kategori_kegiatan} />
              {!isLomba && <InfoRow label="Tingkatan" value={p.tingkatan} />}
              <InfoRow label="Tahun Kegiatan"     value={p.tahun_kegiatan} />
              {isLomba && <>
                <InfoRow label="Model Pelaksanaan" value={p.model_pelaksanaan} />
                <InfoRow label="Jumlah Peserta"    value={p.jumlah_peserta} />
                <InfoRow label="Capaian"           value={p.capaian} />
                <InfoRow label="Tanggal Mulai"     value={p.tanggal_mulai} />
                <InfoRow label="Tanggal Selesai"   value={p.tanggal_selesai} />
              </>}
              <div className="col-span-2">
                <InfoRow label="URL Penyelenggara" value={
                  p.url_penyelenggara
                    ? <a href={p.url_penyelenggara} target="_blank" rel="noopener noreferrer"
                         className="text-blue-600 hover:underline">{p.url_penyelenggara}</a>
                    : null
                } />
              </div>
              {p.keterangan && <div className="col-span-2"><InfoRow label="Keterangan" value={p.keterangan} /></div>}
            </>
          )}
        </div>
      </div>

      {/* Karya Mahasiswa */}
      {isKarya && (
        <div>
          <SectionTitle>Data Karya Mahasiswa</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            {editing ? (
              <>
                <EditInput label="Nama Lembaga/Mitra"  name="nama_lembaga"        value={d.nama_lembaga}        onChange={set} />
                <EditInput label="Jenis Karya"         name="jenis_karya_teks"    value={d.jenis_karya_teks}    onChange={set} />
                <EditSelect label="Pilihan Jenis Karya" name="jenis_karya_pilihan"
                  value={d.jenis_karya_pilihan} options={OPT_JENIS_KARYA} onChange={set} />
                <EditInput label="Nomor Surat"         name="nomor_surat"         value={d.nomor_surat}         onChange={set} />
                <EditInput label="Tanggal Surat"       name="tanggal_surat"       value={d.tanggal_surat}       onChange={set} />
                <EditInput label="Deskripsi Karya"     name="deskripsi_karya"     value={d.deskripsi_karya}     onChange={set} span2 />
                <EditInput label="Manfaat Karya"       name="manfaat_karya"       value={d.manfaat_karya}       onChange={set} span2 />
              </>
            ) : (
              <>
                <InfoRow label="Nama Lembaga/Mitra"  value={p.nama_lembaga} />
                <InfoRow label="Jenis Karya"         value={p.jenis_karya_teks} />
                <InfoRow label="Pilihan Jenis Karya" value={p.jenis_karya_pilihan} />
                <InfoRow label="Nomor Surat"         value={p.nomor_surat} />
                <InfoRow label="Tanggal Surat"       value={p.tanggal_surat} />
                <div className="col-span-2"><InfoRow label="Deskripsi Karya" value={p.deskripsi_karya} /></div>
                <div className="col-span-2"><InfoRow label="Manfaat Karya"   value={p.manfaat_karya} /></div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Data Kelompok */}
      {isKelompok && (
        <div>
          <SectionTitle>Data Kelompok</SectionTitle>
          <div className="grid grid-cols-2 gap-4 mb-3">
            {editing ? (
              <>
                <EditInput label="Nama Ketua"           name="nama_ketua"           value={d.nama_ketua}           onChange={set} />
                <EditInput label="Peran Pengeclaim"     name="peran_pengeclaim"     value={d.peran_pengeclaim}     onChange={set} />
                <EditInput label="Keterangan Kelompok"  name="keterangan_kelompok"  value={d.keterangan_kelompok}  onChange={set} span2 />
              </>
            ) : (
              <>
                <InfoRow label="Nama Ketua"           value={p.nama_ketua} />
                <InfoRow label="Peran Pengeclaim"     value={p.peran_pengeclaim} />
                {p.keterangan_kelompok &&
                  <div className="col-span-2"><InfoRow label="Keterangan Kelompok" value={p.keterangan_kelompok} /></div>}
              </>
            )}
          </div>
          {anggota.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-2">Anggota Lainnya</p>
              <div className="space-y-1.5">
                {anggota.map((a, i) => (
                  <div key={i} className="flex gap-6 text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-500 w-4">{i + 2}.</span>
                    <span className="text-gray-900 font-medium">{a.nama}</span>
                    <span className="text-gray-500 font-mono">{a.nim}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dokumen */}
      <div>
        <SectionTitle>Dokumen & File</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <FileLink label="Foto Penyerahan Sertifikat" path={p.foto_penyerahan_path} />
          <FileLink label="Dokumen Lainnya"            path={p.dokumen_lainnya_path} />
        </div>
      </div>

      {/* Estimasi Reward */}
      {d.estimasi_reward != null && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">Estimasi Dana Penghargaan</p>
            <p className="text-xs text-blue-400 mt-0.5">
              Berdasarkan SK Rektor No. 078/B.02/UKDW/2023 · Non PUSPRESNAS
            </p>
          </div>
          {editing ? (
            <input type="number" value={d.estimasi_reward ?? ""}
              onChange={e => set("estimasi_reward", e.target.value ? Number(e.target.value) : null)}
              className="w-44 text-right px-2.5 py-1.5 border border-blue-300 rounded-lg text-lg font-bold text-blue-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-2xl font-bold text-blue-700">
              {"Rp " + Number(d.estimasi_reward).toLocaleString("id-ID")}
            </p>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div>
        <InfoRow label="Tanggal Pengajuan" value={p.created_at} />
      </div>
    </div>
  );
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function DetailKlaim() {
  const { id }   = useParams();
  const router   = useRouter();
  const [claim,         setClaim]         = useState(null);
  const [pengajuan,     setPengajuan]     = useState(null);
  const [miripClaim,    setMiripClaim]    = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [notFound,      setNotFound]      = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const res = await fetch(`http://127.0.0.1:8000/claims/${id}`);
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    const data = await res.json();
    setClaim(data);

    // Ambil data pengajuan lengkap
    const pRes = await fetch(`http://127.0.0.1:8000/pengajuan/by-claim/${id}`);
    if (pRes.ok) setPengajuan(await pRes.json());

    // Ambil klaim mirip jika ada
    if (data.mirip_dengan_id) {
      const r2 = await fetch(`http://127.0.0.1:8000/claims/${data.mirip_dengan_id}`);
      if (r2.ok) setMiripClaim(await r2.json());
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  const opId = typeof window !== "undefined" ? sessionStorage.getItem("operator_id") : null;
  const opHeaders = opId ? { "x-operator-id": opId } : {};

  const handleApprove = async () => {
    setActionLoading(true);
    await fetch(`http://127.0.0.1:8000/claims/${id}/approve`, { method: "PATCH", headers: opHeaders });
    await fetchAll();
    setActionLoading(false);
  };

  const handleDiscard = async () => {
    if (!confirm("Yakin ingin menghapus klaim ini?")) return;
    setActionLoading(true);
    await fetch(`http://127.0.0.1:8000/claims/${id}`, { method: "DELETE", headers: opHeaders });
    router.push("/operator");
  };

  if (loading)  return <p className="text-center mt-20 text-gray-400">Memuat data...</p>;
  if (notFound) return (
    <div className="text-center mt-20">
      <p className="text-gray-500">Klaim tidak ditemukan.</p>
      <Link href="/operator" className="text-blue-600 hover:underline text-sm mt-2 inline-block">← Kembali</Link>
    </div>
  );

  const fileUrl = `http://127.0.0.1:8000/uploads/${claim.sertifikat_filename}`;
  const canAct  = claim.status !== "sudah dicek";

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link href="/operator" className="text-sm text-blue-600 hover:underline">← Kembali ke Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Detail Klaim #{claim.id}</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_STYLE[claim.status] ?? "bg-gray-100 text-gray-700"}`}>
              {claim.status}
            </span>
            {canAct && (
              <>
                <button onClick={handleApprove} disabled={actionLoading}
                  className="px-4 py-1.5 rounded-md text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                  Approve
                </button>
                <button onClick={handleDiscard} disabled={actionLoading}
                  className="px-4 py-1.5 rounded-md text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50">
                  Discard
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sertifikat + Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <SectionTitle>Informasi Klaim (Anti-Double Claim)</SectionTitle>
            <InfoRow label="Nama Lomba" value={claim.nama_lomba} />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Tingkat"   value={claim.tingkat} />
              <InfoRow label="Peringkat" value={claim.peringkat} />
            </div>
            <InfoRow label="Tanggal" value={claim.tanggal} />
            <InfoRow label="Mahasiswa"   value={claim.nama_display} />
            <InfoRow label="Email"       value={claim.mahasiswa_email} />
            {claim.verified_by_nama && (
              <div className="col-span-2 mt-1 rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-3">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-green-700">Diverifikasi oleh {claim.verified_by_nama}</p>
                  <p className="text-xs text-green-500 mt-0.5">{claim.verified_at ?? "—"}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <SectionTitle>Preview Sertifikat</SectionTitle>
            <CertPreview url={fileUrl} filename={claim.sertifikat_filename} />
            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
               className="mt-3 inline-block text-sm text-blue-600 hover:underline">
              Buka di tab baru ↗
            </a>
          </div>
        </div>

        {/* Data pengajuan lengkap */}
        <PengajuanDetail p={pengajuan} onSaved={fetchAll} />

        {/* Klaim yang mirip */}
        {claim.status === "perlu ditinjau" && miripClaim && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6">
            <h2 className="text-base font-semibold text-yellow-800 mb-4">
              Terdeteksi Mirip Dengan Klaim #{miripClaim.id}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 text-sm">
                <InfoRow label="Nama Lomba" value={miripClaim.nama_lomba} />
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Tingkat"   value={miripClaim.tingkat} />
                  <InfoRow label="Peringkat" value={miripClaim.peringkat} />
                </div>
                <InfoRow label="Tanggal"    value={miripClaim.tanggal} />
                <InfoRow label="Mahasiswa"  value={miripClaim.nama_display} />
                <Link href={`/operator/${miripClaim.id}`}
                      className="inline-block text-sm text-blue-600 hover:underline mt-1">
                  Lihat detail klaim #{miripClaim.id} ↗
                </Link>
              </div>
              <div>
                <p className="text-xs text-yellow-600 uppercase mb-2">Preview Sertifikat</p>
                <CertPreview
                  url={`http://127.0.0.1:8000/uploads/${miripClaim.sertifikat_filename}`}
                  filename={miripClaim.sertifikat_filename}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
