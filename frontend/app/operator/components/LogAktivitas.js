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

export default function LogAktivitas({ operatorId }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/audit-log`, { headers: { "x-operator-id": String(operatorId) } });
      const data = res.ok ? await res.json() : [];
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Log Aktivitas</h1>
          <p className="text-gray-400 mt-3 text-[14px]">Rekam jejak semua aksi yang dilakukan operator.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-500 text-[12px] font-bold rounded-xl hover:bg-gray-50 transition-colors mt-1"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          REFRESH
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
          <p className="text-center text-gray-400 text-[13px] py-16">Belum ada aktivitas tercatat.</p>
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
