"use client";

import { useState, useEffect } from "react";
import { API_URL, BarChart } from "./shared";

export default function VisualisasiData() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/stats/visualisasi`)
      .then(r => r.ok ? r.json() : Promise.reject("Gagal memuat data"))
      .then(data => { setStats(data); setLoading(false); })
      .catch(e   => { setError(String(e)); setLoading(false); });
  }, []);

  const shortenFakultas = (name) =>
    name
      .replace("Fakultas Teknologi Informasi",    "FTI")
      .replace("Fakultas Bisnis",                  "F. Bisnis")
      .replace("Fakultas Bioteknologi",            "F. Bioteknologi")
      .replace("Fakultas Kedokteran",              "F. Kedokteran")
      .replace("Fakultas Arsitektur dan Desain",   "F. Arsitektur & Desain")
      .replace("Fakultas Humaniora",               "F. Humaniora");

  return (
    <div>
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Visualisasi Data</h1>
          <p className="text-gray-400 mt-3 text-[14px]">Statistik klaim sertifikat berdasarkan kategori.</p>
        </div>
        {stats && (
          <div className="flex-shrink-0 text-right">
            <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Total Klaim</p>
            <p className="text-3xl font-black text-gray-900 tabular-nums leading-tight">{stats.total}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Memuat data...</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-red-100">
          <p className="text-sm text-red-500 font-medium">Gagal memuat data statistik.</p>
          <p className="text-xs text-gray-400 mt-1">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-5">
              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Berdasarkan</p>
              <h2 className="text-base font-bold text-gray-900 mt-0.5">Fakultas</h2>
            </div>
            <BarChart data={stats.by_fakultas} colorClass="bg-blue-500" formatLabel={shortenFakultas} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-5">
              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Berdasarkan</p>
              <h2 className="text-base font-bold text-gray-900 mt-0.5">Program Studi</h2>
            </div>
            <BarChart data={stats.by_prodi} colorClass="bg-violet-500" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-5">
              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Berdasarkan</p>
              <h2 className="text-base font-bold text-gray-900 mt-0.5">Jenis Kegiatan</h2>
            </div>
            {stats.by_jenis.length > 0 && (
              <div className="space-y-4">
                {stats.by_jenis.map((item, i) => {
                  const colors     = ["bg-emerald-500", "bg-orange-400", "bg-gray-300"];
                  const textColors = ["text-emerald-600", "text-orange-500", "text-gray-400"];
                  const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[i] ?? "bg-gray-300"}`} />
                        <p className="text-[13px] text-gray-700">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-28 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colors[i] ?? "bg-gray-300"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-[12px] font-semibold w-10 text-right tabular-nums ${textColors[i] ?? "text-gray-500"}`}>
                          {item.count} <span className="font-normal text-gray-400">({pct}%)</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-5">
              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Berdasarkan</p>
              <h2 className="text-base font-bold text-gray-900 mt-0.5">Tahun Kegiatan</h2>
            </div>
            <BarChart data={stats.by_tahun} colorClass="bg-amber-400" />
          </div>
        </div>
      )}
    </div>
  );
}
