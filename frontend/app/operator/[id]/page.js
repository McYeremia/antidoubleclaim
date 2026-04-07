"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const STATUS_STYLE = {
  aman: "bg-green-100 text-green-800",
  "perlu ditinjau": "bg-yellow-100 text-yellow-800",
};

export default function DetailKlaim() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/claims/${id}`)
      .then((res) => {
        if (res.status === 404) { setNotFound(true); return null; }
        return res.json();
      })
      .then((data) => { if (data) setClaim(data); })
      .finally(() => setLoading(false));
  }, [id]);

  const fileUrl = claim
    ? `http://127.0.0.1:8000/uploads/${claim.sertifikat_filename}`
    : null;

  const isPdf = claim?.sertifikat_filename?.toLowerCase().endsWith(".pdf");

  if (loading) return <p className="text-center mt-20 text-gray-400">Memuat data...</p>;
  if (notFound) return (
    <div className="text-center mt-20">
      <p className="text-gray-500">Klaim tidak ditemukan.</p>
      <Link href="/operator" className="text-blue-600 hover:underline text-sm mt-2 inline-block">← Kembali ke Dashboard</Link>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/operator" className="text-sm text-blue-600 hover:underline">← Kembali ke Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Detail Klaim #{claim.id}</h1>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_STYLE[claim.status] ?? "bg-gray-100 text-gray-700"}`}>
            {claim.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Info Klaim */}
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
              <p className="text-xs text-gray-400 uppercase">Tanggal Sertifikat</p>
              <p className="text-gray-900 mt-0.5">{claim.tanggal}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">File Sertifikat</p>
              <p className="text-gray-600 text-sm font-mono mt-0.5">{claim.sertifikat_filename}</p>
            </div>

            {/* Peringatan jika perlu ditinjau */}
            {claim.status === "perlu ditinjau" && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mt-2">
                <p className="text-sm font-semibold text-yellow-800">Klaim ini perlu ditinjau</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Sistem mendeteksi kesamaan sertifikat dan peringkat dengan klaim lain. Silakan periksa sertifikat secara manual.
                </p>
              </div>
            )}
          </div>

          {/* Preview Sertifikat */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-700 border-b pb-2 mb-4">Preview Sertifikat</h2>

            {isPdf ? (
              <iframe
                src={fileUrl}
                className="w-full h-96 rounded border border-gray-200"
                title="Preview Sertifikat PDF"
              />
            ) : (
              <img
                src={fileUrl}
                alt="Sertifikat"
                className="w-full rounded border border-gray-200 object-contain max-h-96"
              />
            )}

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              Buka di tab baru ↗
            </a>
          </div>

        </div>
      </div>
    </main>
  );
}
