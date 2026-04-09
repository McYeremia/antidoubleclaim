"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const STATUS_STYLE = {
  "belum dicek":    "bg-blue-100 text-blue-800",
  "perlu ditinjau": "bg-yellow-100 text-yellow-800",
  "sudah dicek":    "bg-green-100 text-green-800",
};

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

// ── Blok data pengajuan lengkap ───────────────────────────────────────────────
function PengajuanDetail({ p }) {
  if (!p) return null;

  const isLomba   = p.kategori_simkatmawa === "lomba_mandiri";
  const isKarya   = p.kategori_kegiatan?.startsWith("Karya Mahasiswa");
  const isKelompok = p.jenis_kepesertaan === "kelompok";

  // Parse anggota dari GROUP_CONCAT "nama|nim;;nama|nim"
  const anggota = p.anggota_list
    ? p.anggota_list.split(";;").map((s) => { const [nama, nim] = s.split("|"); return { nama, nim }; })
    : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <h2 className="text-base font-semibold text-gray-700">Data Pengajuan Lengkap</h2>

      {/* Data Mahasiswa */}
      <div>
        <SectionTitle>Data Mahasiswa</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Nama"     value={p.nama_display} />
          <InfoRow label="Email"    value={p.mahasiswa_email} />
          <InfoRow label="Nomor WA" value={p.nomor_wa} />
        </div>
      </div>

      {/* Dosen Pembimbing */}
      <div>
        <SectionTitle>Dosen Pembimbing</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Menggunakan Dospem" value={p.ada_dospem === "ya" ? "Ya" : "Tidak"} />
          {p.ada_dospem === "ya" && <InfoRow label="NIK/NIDN/NIDK" value={p.nidn_dospem} />}
        </div>
        <div className="mt-3">
          <FileLink label="Surat Tugas Dospem" path={p.surat_tugas_path} />
        </div>
      </div>

      {/* Detail Kegiatan */}
      <div>
        <SectionTitle>Detail Kegiatan</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Kategori SIMKATMAWA"
            value={isLomba ? "Lomba Mandiri" : "Rekognisi Non-Lomba"} />
          <InfoRow label="Jenis Kepesertaan"  value={p.jenis_kepesertaan} />
          <InfoRow label="Nama Kegiatan"      value={p.nama_kegiatan} />
          <InfoRow label="Kategori Kegiatan"  value={p.kategori_kegiatan} />
          {!isLomba && <InfoRow label="Tingkatan"     value={p.tingkatan} />}
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
          {p.keterangan && (
            <div className="col-span-2">
              <InfoRow label="Keterangan" value={p.keterangan} />
            </div>
          )}
        </div>
      </div>

      {/* Karya Mahasiswa */}
      {isKarya && (
        <div>
          <SectionTitle>Data Karya Mahasiswa</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Nama Lembaga/Mitra"  value={p.nama_lembaga} />
            <InfoRow label="Jenis Karya"         value={p.jenis_karya_teks} />
            <InfoRow label="Pilihan Jenis Karya" value={p.jenis_karya_pilihan} />
            <InfoRow label="Nomor Surat"         value={p.nomor_surat} />
            <InfoRow label="Tanggal Surat"       value={p.tanggal_surat} />
            <div className="col-span-2"><InfoRow label="Deskripsi Karya" value={p.deskripsi_karya} /></div>
            <div className="col-span-2"><InfoRow label="Manfaat Karya"   value={p.manfaat_karya} /></div>
          </div>
        </div>
      )}

      {/* Data Kelompok */}
      {isKelompok && (
        <div>
          <SectionTitle>Data Kelompok</SectionTitle>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <InfoRow label="Nama Ketua"           value={p.nama_ketua} />
            <InfoRow label="Peran Pengeclaim"     value={p.peran_pengeclaim} />
            {p.keterangan_kelompok && (
              <div className="col-span-2">
                <InfoRow label="Keterangan Kelompok" value={p.keterangan_kelompok} />
              </div>
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

  const handleApprove = async () => {
    setActionLoading(true);
    await fetch(`http://127.0.0.1:8000/claims/${id}/approve`, { method: "PATCH" });
    await fetchAll();
    setActionLoading(false);
  };

  const handleDiscard = async () => {
    if (!confirm("Yakin ingin menghapus klaim ini?")) return;
    setActionLoading(true);
    await fetch(`http://127.0.0.1:8000/claims/${id}`, { method: "DELETE" });
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
            {claim.verified_at && <InfoRow label="Diverifikasi" value={claim.verified_at} />}
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
        <PengajuanDetail p={pengajuan} />

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
