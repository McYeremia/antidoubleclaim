"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import OperatorSidebar, { OperatorTopbar } from "../_sidebar";
import { ConfirmModal } from "../components/shared";

const STATUS_STYLE = {
  "belum dicek":    "bg-blue-100 text-blue-700",
  "perlu ditinjau": "bg-orange-100 text-orange-700",
  "sudah dicek":    "bg-green-100 text-green-700",
};

// ── Konstanta pilihan (sinkron dengan TambahKlaimWizard) ──────────────────────
const TAHUN_INI = new Date().getFullYear();
const OPT_TAHUN = [String(TAHUN_INI), String(TAHUN_INI - 1), String(TAHUN_INI - 2)];

const isLombaMandiri = (kat) =>
  kat === "lomba_mandiri_puspresnas" || kat === "lomba_mandiri_non_puspresnas";

const LABEL_KATEGORI = {
  lomba_mandiri_puspresnas:     "Lomba Mandiri — Puspresnas (DIKTI)",
  lomba_mandiri_non_puspresnas: "Lomba Mandiri — Non Puspresnas (Non DIKTI)",
  rekognisi:                    "Rekognisi Non-Lomba",
};

const OPT_KATEGORI_SIMKATMAWA = [
  { value: "lomba_mandiri_puspresnas",     label: "Lomba Mandiri — Puspresnas (DIKTI)" },
  { value: "lomba_mandiri_non_puspresnas", label: "Lomba Mandiri — Non Puspresnas (Non DIKTI)" },
  { value: "rekognisi",                    label: "Rekognisi Non-Lomba" },
];
const OPT_JENIS_KEPESERTAAN = [
  { value: "individu", label: "Individu" },
  { value: "kelompok", label: "Kelompok" },
];
const OPT_ADA_DOSPEM = [
  { value: "ya",    label: "Ya" },
  { value: "tidak", label: "Tidak" },
];
const OPT_KATEGORI_LOMBA    = ["Provinsi / Wilayah", "Nasional", "Internasional"];
const OPT_TINGKATAN         = ["Internasional", "Nasional", "Provinsi"];
const OPT_MODEL_PELAKSANAAN = ["Online", "Offline"];
const OPT_CAPAIAN = [
  "Juara 1", "Juara 2", "Juara 3",
  "Harapan 1", "Harapan 2", "Harapan 3",
  "Didanai / Lolos Wilayah",
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

// ── Kalkulasi estimasi reward (sinkron dengan TambahKlaimWizard) ──────────────
const PENGALI_REWARD = 225_000;
const TABEL_PUSPRESNAS = { peserta: 0.5, didanai: 3, final: 6, juara3: 12, juara2: 15, juara1: 18 };
const TABEL_NON_PUSPRESNAS = {
  "Provinsi / Wilayah": { peserta: 0.5, didanai: 1, final: 2, juara3: 4,  juara2: 5,  juara1: 6  },
  "Nasional":           { peserta: 0.5, didanai: 2, final: 4, juara3: 8,  juara2: 10, juara1: 12 },
  "Internasional":      { peserta: 0.5, didanai: 3, final: 6, juara3: 12, juara2: 15, juara1: 18 },
};

function capaianKeLevel(capaian) {
  if (!capaian) return null;
  if (capaian.includes("Juara 1"))                                                          return "juara1";
  if (capaian.includes("Juara 2"))                                                          return "juara2";
  if (capaian.includes("Juara 3"))                                                          return "juara3";
  if (capaian.startsWith("Harapan") || capaian.includes("Finalis") || capaian.includes("Final") || capaian.includes("Apresiasi")) return "final";
  if (capaian.includes("Didanai") || capaian.includes("Lolos"))                            return "didanai";
  if (capaian.includes("Peserta") || capaian.includes("Proposal") || capaian.includes("Partisipasi")) return "peserta";
  return null;
}

function hitungEstimasi(form) {
  if (!isLombaMandiri(form.kategori_simkatmawa)) return null;
  const tabel = form.kategori_simkatmawa === "lomba_mandiri_puspresnas"
    ? TABEL_PUSPRESNAS
    : TABEL_NON_PUSPRESNAS[form.kategori_kegiatan];
  if (!tabel) return null;
  const level = capaianKeLevel(form.capaian);
  if (!level) return null;

  const tahapan = ["peserta", "didanai", "final"];
  const juaraMap = { juara3: "juara3", juara2: "juara2", juara1: "juara1" };
  let total = 0;
  for (const t of tahapan) {
    total += tabel[t];
    if (t === level) break;
    if (level in juaraMap && t === "final") { total += tabel[level]; break; }
  }

  const n = Math.max(1, parseInt(form.jumlah_anggota) || 1);
  const bonusFactor = form.jenis_kepesertaan === "kelompok"
    ? (n > 10 ? 1.5 : n >= 6 ? 1.25 : 1) : 1;

  return Math.round(total * bonusFactor * PENGALI_REWARD);
}

// ── Helper ────────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-gray-900 mt-1 text-[13px] font-medium">{value}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4 mt-6 first:mt-0">{children}</h3>;
}

function CertPreview({ url, filename }) {
  if (!url || !filename) return null;
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  return (
    <div className="relative group overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-inner">
      {isPdf
        ? <iframe src={url} className="w-full h-80 rounded-2xl" title="Preview" />
        : <img src={url} alt="Preview" className="w-full rounded-2xl object-contain max-h-[400px]" />
      }
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>
    </div>
  );
}

function FileLink({ label, path }) {
  if (!path) return null;
  const filename = path.split(/[\\/]/).pop();
  const url = `http://127.0.0.1:8000/uploads/${filename}`;
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <a href={url} target="_blank" rel="noopener noreferrer"
         className="text-[13px] font-bold text-gray-900 underline underline-offset-4 hover:text-blue-600 mt-1 inline-block transition-colors">
        {filename} ↗
      </a>
    </div>
  );
}

// ── Helper input untuk mode edit ─────────────────────────────────────────────
function EditInput({ label, name, value, onChange, type = "text", span2 = false }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 ml-1">{label}</p>
      <input
        type={type}
        value={value ?? ""}
        onChange={e => onChange(name, e.target.value)}
        className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
      />
    </div>
  );
}

function EditSelect({ label, name, value, onChange, options, span2 = false }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 ml-1">{label}</p>
      <select
        value={value ?? ""}
        onChange={e => onChange(name, e.target.value)}
        className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
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
  const [editing,       setEditing]       = useState(false);
  const [form,          setForm]          = useState({});
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [autoEstimasi,  setAutoEstimasi]  = useState(true);

  if (!p) return null;

  const isLomba    = isLombaMandiri(editing ? form.kategori_simkatmawa : p.kategori_simkatmawa);
  const isKarya    = (editing ? form.kategori_kegiatan : p.kategori_kegiatan)?.startsWith("Karya Mahasiswa");
  const isKelompok = (editing ? form.jenis_kepesertaan : p.jenis_kepesertaan) === "kelompok";

  const anggota = p.anggota_list
    ? p.anggota_list.split(";;").map(s => { const [nama, nim] = s.split("|"); return { nama, nim }; })
    : [];

  const startEdit = () => {
    setForm({ ...p });
    setAutoEstimasi(true);
    setEditing(true);
    setSaved(false);
  };

  const cancelEdit = () => setEditing(false);

  const AUTO_TRIGGER = ["capaian", "kategori_kegiatan", "kategori_simkatmawa", "jenis_kepesertaan", "jumlah_anggota"];

  const set = (name, value) => {
    if (name === "estimasi_reward") {
      setAutoEstimasi(false);
      const updated = { ...form, estimasi_reward: value === "" ? null : Number(value) };
      setForm(updated);
      return;
    }
    const updated = { ...form, [name]: value };
    if (autoEstimasi && AUTO_TRIGGER.includes(name)) {
      const hasil = hitungEstimasi(updated);
      if (hasil !== null) updated.estimasi_reward = hasil;
    }
    setForm(updated);
  };

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
    <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-10 space-y-10">
      <div className="flex items-center justify-between border-b border-gray-50 pb-6">
        <div>
          <h2 className="text-[18px] font-black text-gray-900 tracking-tight">Data Pengajuan Lengkap</h2>
          <p className="text-[12px] text-gray-400 mt-1 font-medium">Informasi mendetail dari wizard mahasiswa.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-[12px] text-green-600 font-bold uppercase tracking-widest mr-2 animate-pulse">✓ TERSIMPAN</span>}
          {editing ? (
            <>
              <button onClick={cancelEdit}
                className="px-4 py-2 text-[12px] font-bold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                BATAL
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2 text-[12px] font-black rounded-xl bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-all shadow-lg shadow-gray-200">
                {saving ? "MENYIMPAN..." : "SIMPAN PERUBAHAN"}
              </button>
            </>
          ) : (
            <button onClick={startEdit}
              className="px-4 py-2 text-[12px] font-black rounded-xl border border-gray-900 text-gray-900 hover:bg-gray-50 transition-all flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              EDIT DATA
            </button>
          )}
        </div>
      </div>

      <div className="space-y-10">
        {/* Profil Mahasiswa + Dosen Pembimbing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
          {/* Data Mahasiswa */}
          <div className="space-y-5">
            <SectionTitle>Profil Mahasiswa</SectionTitle>
            {editing ? (
              <div className="grid grid-cols-1 gap-5">
                <EditInput label="Nama Lengkap"   name="nama_display" value={d.nama_display} onChange={set} />
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <InfoRow label="Email Institusi" value={p.mahasiswa_email} />
                </div>
                <EditInput label="Nomor WhatsApp" name="nomor_wa"     value={d.nomor_wa}     onChange={set} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                <InfoRow label="Nama Lengkap"     value={p.nama_display} />
                <InfoRow label="Email Institusi"  value={p.mahasiswa_email} />
                <InfoRow label="Nomor WhatsApp"   value={p.nomor_wa} />
              </div>
            )}
          </div>

          {/* Dosen Pembimbing */}
          <div className="space-y-5">
            <SectionTitle>Dosen Pembimbing</SectionTitle>
            {editing ? (
              <div className="grid grid-cols-1 gap-5">
                <EditSelect label="Menggunakan Dospem" name="ada_dospem" value={d.ada_dospem}
                  options={OPT_ADA_DOSPEM} onChange={set} />
                {d.ada_dospem === "ya" &&
                  <EditInput label="NIK/NIDN/NIDK" name="nidn_dospem" value={d.nidn_dospem} onChange={set} />}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                <InfoRow label="Menggunakan Dospem" value={p.ada_dospem === "ya" ? "Ya" : "Tidak"} />
                {p.ada_dospem === "ya" && <InfoRow label="NIK/NIDN/NIDK" value={p.nidn_dospem} />}
              </div>
            )}
            <div className="pt-1">
              <FileLink label="Surat Tugas Dospem" path={p.surat_tugas_path} />
            </div>
          </div>
        </div>

        {/* Detail Kegiatan */}
        <div className="space-y-6">
          <SectionTitle>Rincian Kegiatan</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {editing ? (
              <>
                <EditSelect label="Kategori SIMKATMAWA" name="kategori_simkatmawa"
                  value={d.kategori_simkatmawa} options={OPT_KATEGORI_SIMKATMAWA} onChange={set} />
                <EditSelect label="Jenis Kepesertaan" name="jenis_kepesertaan"
                  value={d.jenis_kepesertaan} options={OPT_JENIS_KEPESERTAAN} onChange={set} />
                <EditSelect label="Tahun Kegiatan" name="tahun_kegiatan"
                  value={d.tahun_kegiatan} options={OPT_TAHUN} onChange={set} />

                <div className="col-span-2 sm:col-span-3">
                   <EditInput label="Nama Lengkap Kegiatan" name="nama_kegiatan" value={d.nama_kegiatan} onChange={set} />
                </div>

                <div className="col-span-2">
                  <EditSelect label="Kategori Kegiatan" name="kategori_kegiatan"
                    value={d.kategori_kegiatan}
                    options={isLomba ? OPT_KATEGORI_LOMBA : OPT_KATEGORI_REKOGNISI}
                    onChange={set} />
                </div>
                {!isLomba && <EditSelect label="Tingkatan" name="tingkatan"
                  value={d.tingkatan} options={OPT_TINGKATAN} onChange={set} />}

                {!isLomba && <>
                  <EditInput label="Tanggal Mulai"   name="tanggal_mulai"
                    value={d.tanggal_mulai}   onChange={set} type="date" />
                  <EditInput label="Tanggal Selesai" name="tanggal_selesai"
                    value={d.tanggal_selesai} onChange={set} type="date" />
                </>}

                {isLomba && <>
                  <EditSelect label="Model Pelaksanaan" name="model_pelaksanaan"
                    value={d.model_pelaksanaan} options={OPT_MODEL_PELAKSANAAN} onChange={set} />
                  <EditInput label="Jumlah Peserta" name="jumlah_peserta"
                    value={d.jumlah_peserta} onChange={set} type="number" />
                  <EditSelect label="Capaian / Peringkat" name="capaian"
                    value={d.capaian} options={OPT_CAPAIAN} onChange={set} />
                  <EditInput label="Tanggal Mulai"   name="tanggal_mulai"
                    value={d.tanggal_mulai}   onChange={set} type="date" />
                  <EditInput label="Tanggal Selesai" name="tanggal_selesai"
                    value={d.tanggal_selesai} onChange={set} type="date" />
                </>}
                <div className="col-span-2 sm:col-span-3">
                  <EditInput label="URL Website Penyelenggara" name="url_penyelenggara"
                    value={d.url_penyelenggara} onChange={set} />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <EditInput label="Keterangan Tambahan" name="keterangan"
                    value={d.keterangan} onChange={set} />
                </div>
              </>
            ) : (
              <>
                <InfoRow label="Kategori SIMKATMAWA"
                  value={LABEL_KATEGORI[p.kategori_simkatmawa] ?? p.kategori_simkatmawa} />
                <InfoRow label="Jenis Kepesertaan"  value={p.jenis_kepesertaan} />
                <InfoRow label="Tahun Kegiatan"     value={p.tahun_kegiatan} />

                <div className="col-span-2 sm:col-span-3">
                   <InfoRow label="Nama Lengkap Kegiatan" value={p.nama_kegiatan} />
                </div>

                <div className="col-span-2">
                  <InfoRow label="Kategori Kegiatan"  value={p.kategori_kegiatan} />
                </div>
                {!isLomba && <InfoRow label="Tingkatan" value={p.tingkatan} />}

                {!isLomba && <>
                  <InfoRow label="Tanggal Mulai"   value={p.tanggal_mulai} />
                  <InfoRow label="Tanggal Selesai" value={p.tanggal_selesai} />
                </>}

                {isLomba && <>
                  <InfoRow label="Model Pelaksanaan" value={p.model_pelaksanaan} />
                  <InfoRow label="Jumlah Peserta"    value={p.jumlah_peserta} />
                  <InfoRow label="Capaian / Peringkat" value={p.capaian} />
                  <InfoRow label="Tanggal Mulai"     value={p.tanggal_mulai} />
                  <InfoRow label="Tanggal Selesai"   value={p.tanggal_selesai} />
                </>}
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">URL Website Penyelenggara</p>
                  <a href={p.url_penyelenggara} target="_blank" rel="noopener noreferrer"
                     className="text-[13px] font-bold text-gray-900 underline underline-offset-4 hover:text-blue-600 transition-colors break-all">
                    {p.url_penyelenggara || "—"}
                  </a>
                </div>
                {p.keterangan && <div className="col-span-2 sm:col-span-3"><InfoRow label="Keterangan Tambahan" value={p.keterangan} /></div>}
              </>
            )}
          </div>
        </div>

        {/* Karya Mahasiswa */}
        {isKarya && (
          <div className="space-y-6">
            <SectionTitle>Eksistensi Karya Mahasiswa</SectionTitle>
            <div className="grid grid-cols-2 gap-6">
              {editing ? (
                <>
                  <EditInput label="Nama Lembaga/Mitra"      name="nama_lembaga"        value={d.nama_lembaga}        onChange={set} />
                  <EditInput label="Judul/Jenis Karya"        name="jenis_karya_teks"    value={d.jenis_karya_teks}    onChange={set} />
                  <EditSelect label="Pilihan Kategori Karya"  name="jenis_karya_pilihan"
                    value={d.jenis_karya_pilihan} options={OPT_JENIS_KARYA} onChange={set} />
                  <EditInput label="Nomor Surat Keterangan"   name="nomor_surat"         value={d.nomor_surat}         onChange={set} />
                  <EditInput label="Tanggal Surat"            name="tanggal_surat"       value={d.tanggal_surat}       onChange={set} type="date" />
                  <div className="col-span-2">
                    <EditInput label="Deskripsi Karya"        name="deskripsi_karya"     value={d.deskripsi_karya}     onChange={set} />
                  </div>
                  <div className="col-span-2">
                    <EditInput label="Manfaat Karya"          name="manfaat_karya"       value={d.manfaat_karya}       onChange={set} />
                  </div>
                </>
              ) : (
                <>
                  <InfoRow label="Nama Lembaga/Mitra"        value={p.nama_lembaga} />
                  <InfoRow label="Judul/Jenis Karya"          value={p.jenis_karya_teks} />
                  <InfoRow label="Pilihan Kategori Karya"     value={p.jenis_karya_pilihan} />
                  <InfoRow label="Nomor Surat Keterangan"     value={p.nomor_surat} />
                  <InfoRow label="Tanggal Surat"              value={p.tanggal_surat} />
                  <div className="col-span-2"><InfoRow label="Deskripsi Karya" value={p.deskripsi_karya} /></div>
                  <div className="col-span-2"><InfoRow label="Manfaat Karya"   value={p.manfaat_karya} /></div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Data Kelompok */}
        {isKelompok && (
          <div className="space-y-6">
            <SectionTitle>Kolaborasi Kelompok</SectionTitle>
            <div className="grid grid-cols-2 gap-6 mb-6">
              {editing ? (
                <>
                  <EditInput label="Nama Lengkap Ketua"    name="nama_ketua"          value={d.nama_ketua}          onChange={set} />
                  <EditInput label="Peran Pengeclaim"      name="peran_pengeclaim"    value={d.peran_pengeclaim}    onChange={set} />
                  <div className="col-span-2">
                    <EditInput label="Keterangan Kelompok" name="keterangan_kelompok" value={d.keterangan_kelompok} onChange={set} />
                  </div>
                </>
              ) : (
                <>
                  <InfoRow label="Nama Lengkap Ketua"  value={p.nama_ketua} />
                  <InfoRow label="Peran Pengeclaim"    value={p.peran_pengeclaim} />
                  {p.keterangan_kelompok &&
                    <div className="col-span-2"><InfoRow label="Keterangan Kelompok" value={p.keterangan_kelompok} /></div>}
                </>
              )}
            </div>
            {anggota.length > 0 && (
              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Anggota Kelompok Lainnya</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {anggota.map((a, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-[11px] font-black text-white shrink-0">
                        {i + 2}
                      </div>
                      <div className="truncate">
                        <p className="text-[13px] font-bold text-gray-900 truncate">{a.nama}</p>
                        <p className="text-[11px] font-mono font-bold text-gray-400 tabular-nums">{a.nim}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dokumen */}
        <div className="space-y-6">
          <SectionTitle>Dokumen Pendukung Tambahan</SectionTitle>
          <div className="grid grid-cols-2 gap-6">
            <FileLink label="Foto Penyerahan Sertifikat" path={p.foto_penyerahan_path} />
            <FileLink label="Dokumen Pendukung Lainnya"  path={p.dokumen_lainnya_path} />
          </div>
        </div>
      </div>

      {/* Estimasi Reward */}
      {(d.estimasi_reward != null || editing) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.18em]">Estimasi Dana Penghargaan</p>
            <p className="text-[11px] text-amber-500 mt-0.5">
              SK Rektor 078/B.02/UKDW/2023 ·{" "}
              {d.kategori_simkatmawa === "lomba_mandiri_puspresnas" ? "PUSPRESNAS (DIKTI)" : "Non PUSPRESNAS"}
            </p>
          </div>
          {editing ? (
            <div className="flex items-center gap-2">
              {autoEstimasi && (
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">AUTO</span>
              )}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-gray-500">Rp</span>
                <input
                  type="number"
                  value={d.estimasi_reward ?? ""}
                  onChange={e => set("estimasi_reward", e.target.value)}
                  className="w-52 pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[15px] font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all text-right"
                />
              </div>
              {!autoEstimasi && (
                <button
                  onClick={() => {
                    setAutoEstimasi(true);
                    const hasil = hitungEstimasi(form);
                    if (hasil !== null) set("estimasi_reward", String(hasil));
                  }}
                  className="text-[10px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest underline"
                >
                  Reset Auto
                </button>
              )}
            </div>
          ) : (
            <p className="text-[22px] font-black text-amber-700 tabular-nums">
              {d.estimasi_reward != null ? "Rp " + Number(d.estimasi_reward).toLocaleString("id-ID") : "—"}
            </p>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
        <InfoRow label="Tanggal Pengajuan" value={p.created_at} />
        <p className="text-[10px] font-black text-gray-200 uppercase tracking-widest">Antidoubleclaim Verification Engine</p>
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
  const [discardModal,  setDiscardModal]  = useState(false);

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
    try {
      const res = await fetch(`http://127.0.0.1:8000/claims/${id}/approve`, { method: "PATCH", headers: opHeaders });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      await fetchAll();
    } catch (err) {
      alert(`Gagal menyetujui klaim: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscard = () => setDiscardModal(true);

  const handleDiscardConfirm = async (note) => {
    setDiscardModal(false);
    setActionLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/claims/${id}`, {
        method: "DELETE",
        headers: { ...opHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ catatan: note || null }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      router.push("/operator");
    } catch (err) {
      alert(`Gagal menghapus klaim: ${err.message}`);
      setActionLoading(false);
    }
  };

  if (loading)  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f7f7f8]">
       <svg className="w-10 h-10 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    </div>
  );
  if (notFound) return (
    <div className="min-h-screen bg-[#f7f7f8] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-12 rounded-[32px] shadow-xl text-center border border-gray-100 max-w-sm">
        <p className="text-[16px] font-black text-gray-900 mb-2 uppercase">Klaim Tidak Ditemukan</p>
        <p className="text-[13px] text-gray-400 font-medium mb-8">Data yang Anda cari mungkin telah dihapus atau ID salah.</p>
        <Link href="/operator" className="inline-block px-8 py-3 bg-gray-900 text-white rounded-xl text-[12px] font-black hover:bg-gray-700 transition-all">← KEMBALI</Link>
      </div>
    </div>
  );

  const fileUrl = `http://127.0.0.1:8000/uploads/${claim.sertifikat_filename}`;
  const canAct  = claim.status !== "sudah dicek" && claim.status !== "ditolak";

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>
      <OperatorSidebar activeKey="claim" />
    <div className="flex-1 flex flex-col overflow-auto">
      <OperatorTopbar />
    <main className="flex-1 py-12 px-4 sm:px-10">
      <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">

        {/* Header Navigation */}
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div>
            <Link href="/operator" className="text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors flex items-center gap-2">
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
               </svg>
               Kembali ke Dashboard
            </Link>
            <h1 className="text-4xl font-black text-gray-900 mt-3 tracking-tight">Klaim Sertifikat #{claim.id}</h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${STATUS_STYLE[claim.status] ?? "bg-gray-100 text-gray-700"}`}>
              {claim.status}
            </span>
            {canAct && (
              <div className="flex gap-2">
                <button onClick={handleApprove} disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl text-[12px] font-black bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-all shadow-lg shadow-gray-200">
                  {actionLoading ? "PROCESSING..." : "APPROVE"}
                </button>
                <button onClick={handleDiscard} disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl text-[12px] font-black bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 disabled:opacity-50 transition-all">
                  DISCARD
                </button>
              </div>
            )}
          </div>
        </div>

        {claim.status === "ditolak" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-black text-red-800 uppercase tracking-wide">Klaim Telah Ditolak</p>
              {claim.catatan_penolakan && (
                <>
                  <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest mt-2 mb-1">Alasan:</p>
                  <p className="text-[13px] text-red-700 leading-relaxed">{claim.catatan_penolakan}</p>
                </>
              )}
              {claim.verified_by_nama && (
                <p className="text-[11px] text-red-400 mt-2">Ditolak oleh <strong>{claim.verified_by_nama}</strong></p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Sertifikat Column */}
          <div className="lg:col-span-4 space-y-10">
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
              <SectionTitle>Preview Sertifikat Digital</SectionTitle>
              <CertPreview url={fileUrl} filename={claim.sertifikat_filename} />
              <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                 className="mt-6 inline-flex items-center gap-2 text-[12px] font-black text-gray-900 underline underline-offset-4 hover:text-blue-600 transition-colors uppercase tracking-widest">
                BUKA DALAM TAB BARU
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          {/* Detailed Form Column */}
          <div className="lg:col-span-8 space-y-10">
             <PengajuanDetail p={pengajuan} onSaved={fetchAll} />
          </div>
        </div>

        {/* Similar Claims / Alerts */}
        {claim.status === "perlu ditinjau" && miripClaim && (
          <div className="bg-orange-50/50 border border-orange-200 rounded-[32px] p-10 animate-pulse-slow shadow-xl shadow-orange-100/20">
            <div className="flex items-start gap-3 mb-8">
               <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
               </div>
               <div>
                 <h2 className="text-[18px] font-black text-orange-900 tracking-tight">
                   Peringatan Sistem: Terdeteksi Kemiripan
                 </h2>
                 <p className="text-[13px] text-orange-700 mt-1">
                   Klaim <span className="font-bold">#{claim.id}</span> terdeteksi mirip dengan klaim{" "}
                   <span className="font-bold">#{miripClaim.id}</span> berdasarkan{" "}
                   <span className="font-bold underline underline-offset-2">
                     {claim.flag_alasan === "gambar, nama lomba"
                       ? "judul lomba dan gambar sertifikat"
                       : claim.flag_alasan === "gambar"
                       ? "gambar sertifikat"
                       : claim.flag_alasan === "nama lomba"
                       ? "judul lomba"
                       : "kemiripan terdeteksi"}
                   </span>.
                 </p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-white/60 rounded-2xl p-6 space-y-4">
                <p className="text-[11px] font-black text-orange-400 uppercase tracking-widest mb-4">Data Klaim Pembanding (#{miripClaim.id})</p>
                <InfoRow label="Nama Lomba" value={miripClaim.nama_lomba} />
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Tingkat"   value={miripClaim.tingkat} />
                  <InfoRow label="Peringkat" value={miripClaim.peringkat} />
                </div>
                <InfoRow label="Mahasiswa"  value={miripClaim.nama_display} />
                <Link href={`/operator/compare/${claim.id}`}
                      className="inline-flex items-center gap-2 text-[12px] font-black text-orange-700 bg-orange-100 hover:bg-orange-200 transition-colors px-4 py-2 rounded-xl mt-2 uppercase tracking-widest">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                  </svg>
                  Bandingkan Sertifikat
                </Link>
              </div>
              <div className="space-y-4">
                <p className="text-[11px] font-black text-orange-400 uppercase tracking-widest mb-2">Visual Perbandingan</p>
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
    </div>

    <ConfirmModal
      isOpen={discardModal}
      title="Discard Klaim?"
      message={`Klaim sertifikat #${id} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
      variant="danger"
      requireNote
      noteLabel="Alasan discard"
      notePlaceholder="Contoh: Duplikat terdeteksi, sertifikat tidak valid..."
      confirmLabel="YA, DISCARD"
      onConfirm={handleDiscardConfirm}
      onCancel={() => setDiscardModal(false)}
    />
    </div>
  );
}
