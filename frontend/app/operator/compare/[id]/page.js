"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import OperatorSidebar, { OperatorTopbar } from "../../_sidebar";
import { API, apiFetch, formatTanggal } from "../../components/shared";

const STATUS_LABEL = {
  "belum dicek":    { text: "Belum Dicek",    cls: "bg-[#d4ebe0] text-[#046137]" },
  "perlu ditinjau": { text: "Perlu Ditinjau", cls: "bg-orange-100 text-orange-700" },
  "sudah dicek":    { text: "Sudah Dicek",    cls: "bg-green-100 text-green-700" },
};

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] ?? { text: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.cls}`}>
      {s.text}
    </span>
  );
}

function CertPanel({ claim, label, accent }) {
  if (!claim) return (
    <div className="flex-1 bg-white rounded-[28px] border border-gray-100 shadow-sm p-8 flex items-center justify-center min-h-[400px]">
      <p className="text-gray-300 text-[12px] font-bold uppercase tracking-widest">Memuat...</p>
    </div>
  );

  const opId    = typeof window !== "undefined" ? localStorage.getItem("operator_id") : "";
  const fileUrl  = `/api/file?name=${claim.sertifikat_filename}${opId ? `&op=${opId}` : ""}`;
  const isPdf    = claim.sertifikat_filename?.toLowerCase().endsWith(".pdf");
  const accentBg = accent === "orange" ? "bg-orange-50 border-orange-200" : "bg-[#f0f7f3] border-[#d4ebe0]";
  const accentTxt = accent === "orange" ? "text-orange-600" : "text-[#046137]";

  return (
    <div className="flex-1 bg-white rounded-[28px] border border-gray-100 shadow-sm overflow-hidden">
      {/* Header panel */}
      <div className={`px-6 py-4 border-b ${accentBg} flex items-center justify-between gap-3`}>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${accentTxt}`}>{label}</p>
          <p className="text-[15px] font-black text-gray-900 mt-0.5">Klaim #{claim.id}</p>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      {/* Sertifikat */}
      <div className="p-5 border-b border-gray-50">
        <div className="relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 shadow-inner">
          {isPdf
            ? <iframe src={fileUrl} className="w-full h-72 rounded-2xl" title="Preview" />
            : <img src={fileUrl} alt="Sertifikat" className="w-full rounded-2xl object-contain max-h-72" />
          }
        </div>
        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
           className={`mt-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest underline underline-offset-4 transition-colors ${accentTxt}`}>
          Buka Penuh
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Info */}
      <div className="p-6 space-y-4">
        <InfoItem label="Nama Lomba / Kegiatan" value={claim.nama_lomba} />
        <div className="grid grid-cols-2 gap-4">
          <InfoItem label="Tingkat"   value={claim.tingkat} />
          <InfoItem label="Peringkat" value={claim.peringkat} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem label="Tanggal Mulai"   value={formatTanggal(claim.tanggal_mulai  ?? claim.tanggal)} />
          <InfoItem label="Tanggal Selesai" value={formatTanggal(claim.tanggal_selesai)} />
        </div>
        <div className="pt-3 border-t border-gray-50">
          <InfoItem label="Mahasiswa" value={claim.nama_display} />
          <p className="text-[11px] font-mono text-gray-400 mt-1">{claim.mahasiswa_email}</p>
        </div>
      </div>

      {/* Link ke detail */}
      <div className="px-6 pb-6">
        <Link href={`/operator/${claim.id}`}
              className={`inline-flex w-full items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest border transition-all ${
                accent === "orange"
                  ? "border-orange-200 text-orange-700 hover:bg-orange-50"
                  : "border-[#d4ebe0] text-[#046137] hover:bg-[#f0f7f3]"
              }`}>
          Buka Detail Klaim #{claim.id}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-[13px] font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

export default function ComparePage() {
  const { id }       = useParams();
  const [claimA,     setClaimA]     = useState(null);
  const [claimB,     setClaimB]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const resA = await apiFetch(`${API}/claims/${id}`);
      if (!resA.ok) { setNotFound(true); setLoading(false); return; }
      const a = await resA.json();
      setClaimA(a);

      if (a.mirip_dengan_id) {
        const resB = await apiFetch(`${API}/claims/${a.mirip_dengan_id}`);
        if (resB.ok) setClaimB(await resB.json());
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const FLAG_LABEL = {
    "gambar, nama":  <><strong>Gambar sertifikat</strong> dan <strong>nama</strong> terdeteksi mirip dengan klaim sebelumnya</>,
    "gambar":        <><strong>Gambar sertifikat</strong> terdeteksi mirip dengan klaim sebelumnya</>,
    "nama":          <><strong>Nama lomba/kegiatan</strong> terdeteksi mirip dengan klaim sebelumnya</>,
    // label lama untuk klaim sebelum migrasi
    "gambar, nama lomba":                 <><strong>Gambar sertifikat</strong> dan <strong>judul lomba</strong> terdeteksi mirip dengan klaim sebelumnya</>,
    "nama lomba":                         <><strong>Judul lomba</strong> terdeteksi mirip dengan klaim sebelumnya</>,
    "nama kegiatan + kategori rekognisi": <><strong>Nama kegiatan</strong> dan <strong>kategori rekognisi</strong> terdeteksi mirip dengan klaim sebelumnya</>,
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f7f7f8]">
      <svg className="w-10 h-10 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  if (notFound || !claimA) return (
    <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center p-4">
      <div className="bg-white p-12 rounded-[32px] shadow-xl text-center border border-gray-100 max-w-sm">
        <p className="text-[16px] font-black text-gray-900 mb-2 uppercase">Klaim Tidak Ditemukan</p>
        <Link href="/operator" className="inline-block px-8 py-3 bg-[#046137] text-white rounded-xl text-[12px] font-black hover:bg-[#035230] transition-all mt-6">← Kembali</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>
      <OperatorSidebar activeKey="claim" />
    <div className="flex-1 flex flex-col overflow-auto">
      <OperatorTopbar />
    <main className="flex-1 py-12 px-4 sm:px-10">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <Link href={`/operator/${id}`}
                  className="text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali ke Klaim #{id}
            </Link>
            <h1 className="text-3xl font-black text-gray-900 mt-3 tracking-tight">
              Perbandingan Klaim
            </h1>
            <p className="text-[13px] text-gray-400 mt-1 font-medium">
              #{claimA.id} vs #{claimB?.id ?? "—"}
            </p>
          </div>
        </div>

        {/* Alert kemiripan */}
        {claimA.flag_alasan && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-black text-orange-600 uppercase tracking-widest">Alasan Terdeteksi Mirip</p>
              <p className="text-[13px] font-semibold text-orange-900 mt-0.5">
                {FLAG_LABEL[claimA.flag_alasan] ?? claimA.flag_alasan}
              </p>
            </div>
          </div>
        )}

        {/* Panel perbandingan */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          <CertPanel claim={claimA} label="Klaim Baru (Pengaju)" accent="orange" />

          {/* Divider */}
          <div className="flex lg:flex-col items-center justify-center gap-3 px-2">
            <div className="flex-1 border-t lg:border-t-0 lg:border-l border-dashed border-gray-300" />
            <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-[11px] font-black shrink-0">
              VS
            </div>
            <div className="flex-1 border-t lg:border-t-0 lg:border-l border-dashed border-gray-300" />
          </div>

          <CertPanel claim={claimB} label="Klaim Terdeteksi Mirip" accent="blue" />
        </div>

        {/* Tabel perbedaan */}
        {claimA && claimB && (
          <div className="bg-white rounded-[28px] border border-gray-100 shadow-sm p-8">
            <h2 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-6">
              Perbandingan Data
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-6 text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Field</th>
                    <th className="text-left py-2 pr-6 text-[10px] font-black text-orange-400 uppercase tracking-widest">Klaim #{claimA.id}</th>
                    <th className="text-left py-2 text-[10px] font-black text-[#046137] uppercase tracking-widest">Klaim #{claimB.id}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    ["Nama Lomba",  claimA.nama_lomba,   claimB.nama_lomba],
                    ["Tingkat",     claimA.tingkat,      claimB.tingkat],
                    ["Peringkat",   claimA.peringkat,    claimB.peringkat],
                    ["Tgl Mulai",   formatTanggal(claimA.tanggal_mulai  ?? claimA.tanggal), formatTanggal(claimB.tanggal_mulai  ?? claimB.tanggal)],
                    ["Tgl Selesai", formatTanggal(claimA.tanggal_selesai), formatTanggal(claimB.tanggal_selesai)],
                    ["Mahasiswa",   claimA.nama_display, claimB.nama_display],
                    ["Email",       claimA.mahasiswa_email, claimB.mahasiswa_email],
                  ].map(([field, valA, valB]) => {
                    const same = valA === valB;
                    return (
                      <tr key={field}>
                        <td className="py-3 pr-6 text-[10px] font-black text-gray-400 uppercase tracking-widest align-top">{field}</td>
                        <td className={`py-3 pr-6 font-medium align-top ${same ? "text-gray-500" : "text-orange-700 font-bold"}`}>{valA || "—"}</td>
                        <td className={`py-3 font-medium align-top ${same ? "text-gray-500" : "text-[#035230] font-bold"}`}>{valB || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
    </div>
    </div>
  );
}
