"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_STYLE = {
  aman: {
    badge: "bg-green-100 text-green-800",
    row: "",
  },
  "perlu ditinjau": {
    badge: "bg-yellow-100 text-yellow-800",
    row: "bg-yellow-50",
  },
};

export default function OperatorDashboard() {
  const router = useRouter();
  const [claims, setClaims] = useState([]);

  const handleLogout = () => {
    sessionStorage.removeItem("role");
    router.push("/");
  };
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("semua");

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/claims");
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

  const totalAman = claims.filter((c) => c.status === "aman").length;
  const totalPerluDitinjau = claims.filter((c) => c.status === "perlu ditinjau").length;

  const filtered =
    filter === "semua" ? claims : claims.filter((c) => c.status === filter);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Operator</h1>
            <p className="text-gray-500 mt-1">Pantau dan tinjau klaim sertifikat mahasiswa</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:underline"
          >
            Keluar
          </button>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
            <p className="text-sm text-gray-500">Total Klaim</p>
            <p className="text-4xl font-bold text-gray-800 mt-1">{claims.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-green-200">
            <p className="text-sm text-gray-500">Aman</p>
            <p className="text-4xl font-bold text-green-600 mt-1">{totalAman}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-yellow-300">
            <p className="text-sm text-gray-500">Perlu Ditinjau</p>
            <p className="text-4xl font-bold text-yellow-600 mt-1">{totalPerluDitinjau}</p>
          </div>
        </div>

        {/* Filter + Refresh */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {["semua", "perlu ditinjau", "aman"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  filter === f
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={fetchClaims}
            className="text-sm text-blue-600 hover:underline"
          >
            Refresh
          </button>
        </div>

        {/* Tabel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <p className="text-center text-gray-400 py-12">Memuat data...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Tidak ada klaim ditemukan.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Nama Lomba</th>
                  <th className="px-4 py-3">Tingkat</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Peringkat</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((claim) => {
                  const style = STATUS_STYLE[claim.status] ?? { badge: "bg-gray-100 text-gray-700", row: "" };
                  return (
                    <tr
                      key={claim.id}
                      onClick={() => router.push(`/operator/${claim.id}`)}
                      className={`${style.row} hover:bg-blue-50 cursor-pointer transition-colors`}
                    >
                      <td className="px-4 py-3 font-mono text-gray-500">#{claim.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{claim.nama_lomba}</td>
                      <td className="px-4 py-3 text-gray-600">{claim.tingkat}</td>
                      <td className="px-4 py-3 text-gray-600">{claim.tanggal}</td>
                      <td className="px-4 py-3 text-gray-600">{claim.peringkat}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${style.badge}`}>
                          {claim.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </main>
  );
}
