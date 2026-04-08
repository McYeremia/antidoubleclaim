"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const STATUS_STYLE = {
  "belum dicek":    "bg-blue-100 text-blue-800",
  "perlu ditinjau": "bg-yellow-100 text-yellow-800",
  "sudah dicek":    "bg-green-100 text-green-800",
};

export default function DetailKlaim() {
  const { id }   = useParams();
  const router   = useRouter();
  const [claim,       setClaim]       = useState(null);
  const [miripClaim,  setMiripClaim]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchClaim = async () => {
    setLoading(true);
    const res = await fetch(`http://127.0.0.1:8000/claims/${id}`);
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    const data = await res.json();
    setClaim(data);

    if (data.mirip_dengan_id) {
      const res2  = await fetch(`http://127.0.0.1:8000/claims/${data.mirip_dengan_id}`);
      if (res2.ok) setMiripClaim(await res2.json());
    }
    setLoading(false);
  };

  useEffect(() => { fetchClaim(); }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    await fetch(`http://127.0.0.1:8000/claims/${id}/approve`, { method: "PATCH" });
    await fetchClaim();
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

  const fileUrl  = `http://127.0.0.1:8000/uploads/${claim.sertifikat_filename}`;
  const isPdf    = claim.sertifikat_filename?.toLowerCase().endsWith(".pdf");
  const canAct   = claim.status !== "sudah dicek";

  const CertPreview = ({ url, filename }) => {
    const pdf = filename?.toLowerCase().endsWith(".pdf");
    return pdf
      ? <iframe src={url} className="w-full h-72 rounded border border-gray-200" title="Preview" />
      : <img src={url} alt="Sertifikat" className="w-full rounded border border-gray-200 object-contain max-h-72" />;
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/operator" className="text-sm text-blue-600 hover:underline">← Kembali ke Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Detail Klaim #{claim.id}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_STYLE[claim.status] ?? "bg-gray-100 text-gray-700"}`}>
              {claim.status}
            </span>
            {canAct && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-md text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={handleDiscard}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-md text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                >
                  Discard
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info + Preview klaim ini */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-700 border-b pb-2">Informasi Klaim</h2>
            <div>
              <p className="text-xs text-gray-400 uppercase">Nama Lomba</p>
              <p className="text-gray-900 font-medium mt-0.5">{claim.nama_lomba}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase">Tingkat</p>
                <p className="text-gray-900 mt-0.5">{claim.tingkat}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Peringkat</p>
                <p className="text-gray-900 mt-0.5">{claim.peringkat}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Tanggal</p>
              <p className="text-gray-900 mt-0.5">{claim.tanggal}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">File</p>
              <p className="text-gray-600 text-sm font-mono mt-0.5">{claim.sertifikat_filename}</p>
            </div>
            {claim.verified_at && (
              <div>
                <p className="text-xs text-gray-400 uppercase">Diverifikasi Pada</p>
                <p className="text-gray-600 text-sm mt-0.5">{claim.verified_at}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-700 border-b pb-2 mb-4">Preview Sertifikat</h2>
            <CertPreview url={fileUrl} filename={claim.sertifikat_filename} />
            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
               className="mt-3 inline-block text-sm text-blue-600 hover:underline">
              Buka di tab baru ↗
            </a>
          </div>
        </div>

        {/* Panel klaim yang mirip */}
        {claim.status === "perlu ditinjau" && miripClaim && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6">
            <h2 className="text-base font-semibold text-yellow-800 mb-4">
              Terdeteksi Mirip Dengan Klaim #{miripClaim.id}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-yellow-600 uppercase">Nama Lomba</p>
                  <p className="text-gray-900 font-medium">{miripClaim.nama_lomba}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-yellow-600 uppercase">Tingkat</p>
                    <p className="text-gray-900">{miripClaim.tingkat}</p>
                  </div>
                  <div>
                    <p className="text-xs text-yellow-600 uppercase">Peringkat</p>
                    <p className="text-gray-900">{miripClaim.peringkat}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-yellow-600 uppercase">Tanggal</p>
                  <p className="text-gray-900">{miripClaim.tanggal}</p>
                </div>
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
