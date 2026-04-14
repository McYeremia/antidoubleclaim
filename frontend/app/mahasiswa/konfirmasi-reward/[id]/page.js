"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function KonfirmasiRewardForm() {
  const { id }   = useParams();
  const router   = useRouter();
  const [claim,   setClaim]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/claims/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => { if (data) setClaim(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)  return <p className="text-center mt-20 text-gray-400">Memuat data...</p>;
  if (notFound) return (
    <div className="text-center mt-20">
      <p className="text-gray-500">Klaim tidak ditemukan.</p>
      <Link href="/mahasiswa/dashboard" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
        ← Kembali ke Dashboard
      </Link>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <Link href="/mahasiswa/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Kembali ke Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Konfirmasi Data Reward</h1>
          <p className="text-sm text-gray-500 mt-0.5">Klaim: <span className="font-medium text-gray-700">{claim.nama_lomba}</span></p>
        </div>

        {/* Info Klaim */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Informasi Klaim</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Nama Lomba</p>
              <p className="text-gray-900 mt-0.5">{claim.nama_lomba}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Peringkat</p>
              <p className="text-gray-900 mt-0.5">{claim.peringkat}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Tingkat</p>
              <p className="text-gray-900 mt-0.5">{claim.tingkat}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Tanggal</p>
              <p className="text-gray-900 mt-0.5">{claim.tanggal}</p>
            </div>
          </div>
        </div>

        {/* Form Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex items-center justify-center min-h-48">
          <p className="text-gray-400 text-sm">Form data reward akan ditampilkan di sini.</p>
        </div>

      </div>
    </main>
  );
}
