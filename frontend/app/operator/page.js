"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_BADGE = {
  "perlu ditinjau": "bg-yellow-100 text-yellow-800",
  "belum dicek":    "bg-blue-100 text-blue-800",
  "sudah dicek":    "bg-green-100 text-green-800",
};

export default function OperatorDashboard() {
  const router = useRouter();
  const [claims, setClaims]   = useState([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    sessionStorage.removeItem("role");
    router.push("/");
  };

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res  = await fetch("http://127.0.0.1:8000/claims");
      const data = await res.json();
      setClaims(data);
    } catch {
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem("role") !== "operator") {
      router.replace("/");
      return;
    }
    fetchClaims();
  }, [router]);

  const handleApprove = async (id, e) => {
    e.stopPropagation();
    await fetch(`http://127.0.0.1:8000/claims/${id}/approve`, { method: "PATCH" });
    fetchClaims();
  };

  const handleDiscard = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Yakin ingin menghapus klaim ini?")) return;
    await fetch(`http://127.0.0.1:8000/claims/${id}`, { method: "DELETE" });
    fetchClaims();
  };

  const perluDitinjau = claims.filter(c => c.status === "perlu ditinjau");
  const belumDicek    = claims.filter(c => c.status === "belum dicek");
  const sudahDicek    = claims.filter(c => c.status === "sudah dicek");

  const Section = ({ title, color, items, showActions, showMirip }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className={`px-5 py-3 border-b flex items-center justify-between ${color}`}>
        <h2 className="font-semibold text-sm uppercase tracking-wide">{title}</h2>
        <span className="text-xs font-bold">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">Tidak ada data.</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Nama Lomba</th>
              <th className="px-4 py-2">Tingkat</th>
              <th className="px-4 py-2">Peringkat</th>
              <th className="px-4 py-2">Tanggal</th>
              {showMirip   && <th className="px-4 py-2">Mirip Dengan</th>}
              {showActions && <th className="px-4 py-2 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(claim => (
              <tr
                key={claim.id}
                onClick={() => router.push(`/operator/${claim.id}`)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-mono text-gray-400">#{claim.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{claim.nama_lomba}</td>
                <td className="px-4 py-3 text-gray-600">{claim.tingkat}</td>
                <td className="px-4 py-3 text-gray-600">{claim.peringkat}</td>
                <td className="px-4 py-3 text-gray-600">{claim.tanggal}</td>

                {showMirip && (
                  <td className="px-4 py-3">
                    {claim.mirip_dengan_id ? (
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/operator/${claim.mirip_dengan_id}`); }}
                        className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                      >
                        #{claim.mirip_dengan_id}
                      </button>
                    ) : "—"}
                  </td>
                )}

                {showActions && (
                  <td className="px-4 py-3 text-right space-x-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => handleApprove(claim.id, e)}
                      className="px-3 py-1 rounded-md text-xs font-semibold bg-green-600 text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={e => handleDiscard(claim.id, e)}
                      className="px-3 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Discard
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Operator</h1>
            <p className="text-gray-500 mt-1">Pantau dan tinjau klaim sertifikat mahasiswa</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={fetchClaims} className="text-sm text-blue-600 hover:underline">Refresh</button>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">Keluar</button>
          </div>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-yellow-200">
            <p className="text-xs text-gray-500 uppercase">Perlu Ditinjau</p>
            <p className="text-4xl font-bold text-yellow-600 mt-1">{perluDitinjau.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-blue-200">
            <p className="text-xs text-gray-500 uppercase">Belum Dicek</p>
            <p className="text-4xl font-bold text-blue-600 mt-1">{belumDicek.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-green-200">
            <p className="text-xs text-gray-500 uppercase">Sudah Dicek</p>
            <p className="text-4xl font-bold text-green-600 mt-1">{sudahDicek.length}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-12">Memuat data...</p>
        ) : (
          <>
            <Section
              title="Perlu Ditinjau"
              color="bg-yellow-50 text-yellow-800 border-yellow-200"
              items={perluDitinjau}
              showActions={true}
              showMirip={true}
            />
            <Section
              title="Belum Dicek"
              color="bg-blue-50 text-blue-800 border-blue-200"
              items={belumDicek}
              showActions={true}
              showMirip={false}
            />
            <Section
              title="Sudah Dicek"
              color="bg-green-50 text-green-800 border-green-200"
              items={sudahDicek}
              showActions={false}
              showMirip={false}
            />
          </>
        )}
      </div>
    </main>
  );
}
