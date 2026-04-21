"use client";

import { useEffect, useState } from "react";
import { API, formatDatetime } from "./shared";

const AKSI_LABEL = {
  approve_klaim:      { label: "Approve Klaim",       style: "bg-green-100 text-green-700"   },
  tolak_klaim:        { label: "Tolak Klaim",         style: "bg-red-100 text-red-700"       },
  reward_diproses:    { label: "Reward Diproses",     style: "bg-blue-100 text-blue-700"     },
  reward_dikembalikan:{ label: "Reward Dikembalikan", style: "bg-orange-100 text-orange-700" },
  reward_selesai:     { label: "Reward Selesai",      style: "bg-green-100 text-green-700"   },
  reward_ditolak:     { label: "Reward Ditolak",      style: "bg-red-100 text-red-700"       },
  tambah_operator:    { label: "Tambah Operator",     style: "bg-purple-100 text-purple-700" },
  hapus_operator:     { label: "Hapus Operator",      style: "bg-red-100 text-red-700"       },
  periode_aktif:      { label: "Buka Periode",        style: "bg-[#d4ebe0] text-[#046137]"   },
  periode_tutup:      { label: "Tutup Periode",       style: "bg-gray-100 text-gray-600"     },
  periode_ditutup:    { label: "Tutup Periode",       style: "bg-gray-100 text-gray-600"     },
  arsip_periode:      { label: "Arsip Periode",       style: "bg-purple-100 text-purple-700" },
  hapus_periode:      { label: "Hapus Periode",       style: "bg-red-100 text-red-700"       },
  reset_semua_data:   { label: "Reset Semua Data",    style: "bg-red-200 text-red-800"       },
};

function toLocalDateInput(date) {
  return date.toLocaleDateString("en-CA");
}

function exportToCsv(logs) {
  const headers = ["No", "Waktu", "Operator", "Aksi", "Target", "Detail"];
  const rows = logs.map((log, idx) => [
    idx + 1,
    log.created_at,
    log.operator_nama,
    AKSI_LABEL[log.aksi]?.label ?? log.aksi,
    log.target_tipe ? `${log.target_tipe}${log.target_id ? ` #${log.target_id}` : ""}` : "",
    log.detail ?? "",
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `log-aktivitas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LogAktivitas({ operatorId }) {
  const today    = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [dateFrom, setDateFrom] = useState(toLocalDateInput(thirtyDaysAgo));
  const [dateTo,   setDateTo]   = useState(toLocalDateInput(today));

  const fetchLogs = async (from = dateFrom, to = dateTo) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("date_from", from);
      if (to)   params.set("date_to",   to);
      const res  = await fetch(`${API}/audit-log?${params}`, {
        headers: { "x-operator-id": String(operatorId) },
      });
      const data = res.ok ? await res.json() : [];
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleFilter = () => fetchLogs(dateFrom, dateTo);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Log Aktivitas</h1>
          <p className="text-gray-400 mt-3 text-[14px]">Rekam jejak semua aksi yang dilakukan operator.</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => exportToCsv(logs)}
            disabled={loading || logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#046137] text-white text-[12px] font-bold rounded-xl hover:bg-[#035230] disabled:opacity-40 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            EXPORT CSV
          </button>
          <button
            onClick={handleFilter}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-500 text-[12px] font-bold rounded-xl hover:bg-gray-50 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            REFRESH
          </button>
        </div>
      </div>

      {/* Filter Tanggal */}
      <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Periode</span>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#046137]/30"
        />
        <span className="text-[12px] text-gray-400 font-medium">s/d</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#046137]/30"
        />
        <button
          onClick={handleFilter}
          className="px-4 py-1.5 bg-[#046137] text-white text-[12px] font-bold rounded-lg hover:bg-[#035230] transition-colors"
        >
          Terapkan
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <svg className="w-8 h-8 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-gray-400 text-[13px] py-16">Tidak ada aktivitas pada rentang tanggal ini.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest w-14">No</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Waktu</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Operator</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Aksi</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Target</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => {
                const aksiInfo = AKSI_LABEL[log.aksi] ?? { label: log.aksi, style: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                    <td className="px-6 py-4 text-gray-300 text-[12px] font-semibold tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="px-6 py-4 text-[12px] text-gray-400 tabular-nums whitespace-nowrap">
                      {formatDatetime(log.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-semibold text-gray-900">{log.operator_nama}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${aksiInfo.style}`}>
                        {aksiInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-gray-500">
                      {log.target_tipe && (
                        <span className="font-mono">
                          {log.target_tipe}{log.target_id ? ` #${log.target_id}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[12px] text-gray-500 max-w-xs">
                      <p className="truncate">{log.detail ?? "—"}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && logs.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-50">
            <p className="text-[11px] text-gray-300 font-medium">{logs.length} entri ditampilkan</p>
          </div>
        )}
      </div>
    </div>
  );
}
