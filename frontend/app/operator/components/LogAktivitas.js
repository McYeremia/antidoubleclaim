"use client";

import { useEffect, useState, useRef } from "react";
import { API, apiFetch, formatDatetime, formatTanggal } from "./shared";

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
    log.target_tipe === "periode"
      ? `periode: ${log.detail ?? `#${log.target_id}`}`
      : log.target_tipe === "operator"
      ? (log.detail ?? "").split("|")[0] || `#${log.target_id}`
      : log.target_tipe ? `${log.target_tipe}${log.target_id ? ` #${log.target_id}` : ""}` : "",
    log.target_tipe === "operator"
      ? (() => { const r = (log.detail ?? "").split("|")[1]; return r === "superadmin" ? "Super Admin" : r === "operator" ? "Operator" : "—"; })()
      : log.detail ?? "",
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

const PAGE_SIZE = 20;

export default function LogAktivitas({ operatorId }) {
  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [dateFrom,    setDateFrom]    = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return toLocalDateInput(d);
  });
  const [dateTo,      setDateTo]      = useState(() => toLocalDateInput(new Date()));
  const [appliedFrom, setAppliedFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return toLocalDateInput(d);
  });
  const [appliedTo,   setAppliedTo]   = useState(() => toLocalDateInput(new Date()));

  const dateFromRef = useRef(dateFrom);
  const dateToRef   = useRef(dateTo);

  const handleDateFromChange = (v) => { setDateFrom(v); dateFromRef.current = v; };
  const handleDateToChange   = (v) => { setDateTo(v);   dateToRef.current   = v; };

  const fetchLogs = async (from, to) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("date_from", from);
      if (to)   params.set("date_to",   to);
      const res  = await apiFetch(`${API}/audit-log?${params}`, {
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

  useEffect(() => {
    fetchLogs(dateFromRef.current, dateToRef.current);
  }, []);

  const handleFilter = () => {
    const from = dateFromRef.current;
    const to   = dateToRef.current;
    setAppliedFrom(from);
    setAppliedTo(to);
    setPage(1);
    fetchLogs(from, to);
  };

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
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-[12px] font-bold rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[12px] text-gray-400">Tampilkan dari</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => handleDateFromChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#046137]/30"
          />
          <span className="text-[12px] text-gray-400">s/d</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => handleDateToChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#046137]/30"
          />
          <button
            onClick={handleFilter}
            className="px-4 py-1.5 bg-[#046137] text-white text-[12px] font-bold rounded-lg hover:bg-[#035230] transition-colors"
          >
            Terapkan
          </button>
          {!loading && (
            <span className="text-[12px] text-gray-400 ml-auto">
              {formatTanggal(appliedFrom)} — {formatTanggal(appliedTo)}
              <span className="text-gray-300"> · {logs.length} entri</span>
            </span>
          )}
        </div>
      </div>

      {(() => {
        const totalPages  = Math.ceil(logs.length / PAGE_SIZE);
        const safePage    = Math.min(page, totalPages || 1);
        const startIdx    = (safePage - 1) * PAGE_SIZE;
        const pageLogs    = logs.slice(startIdx, startIdx + PAGE_SIZE);

        return (
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
                  {pageLogs.map((log, idx) => {
                    const aksiInfo = AKSI_LABEL[log.aksi] ?? { label: log.aksi, style: "bg-gray-100 text-gray-600" };
                    return (
                      <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                        <td className="px-6 py-4 text-gray-300 text-[12px] font-semibold tabular-nums">
                          {String(startIdx + idx + 1).padStart(2, "0")}
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
                          {log.target_tipe && (() => {
                            if (log.target_tipe === "periode") {
                              return <span>{log.detail ?? <span className="font-mono">#{log.target_id}</span>}</span>;
                            }
                            if (log.target_tipe === "operator") {
                              const name = (log.detail ?? "").split("|")[0];
                              return <span className="font-medium text-gray-700">{name || <span className="font-mono">#{log.target_id}</span>}</span>;
                            }
                            return (
                              <span className="font-mono">
                                {log.target_tipe}{log.target_id ? ` #${log.target_id}` : ""}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-[12px] text-gray-500 max-w-xs">
                          {log.target_tipe === "operator" ? (() => {
                            const role = (log.detail ?? "").split("|")[1];
                            const label = role === "superadmin" ? "Super Admin" : role === "operator" ? "Operator" : null;
                            return label
                              ? <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${role === "superadmin" ? "bg-purple-100 text-purple-700" : "bg-[#d4ebe0] text-[#046137]"}`}>{label}</span>
                              : <span className="text-gray-300">—</span>;
                          })() : (
                            <p className="truncate">{log.detail ?? "—"}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {!loading && logs.length > 0 && (
              <div className="px-6 py-3.5 border-t border-gray-50 flex items-center justify-between">
                <p className="text-[11px] text-gray-400 font-medium">
                  {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, logs.length)} dari {logs.length} entri
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={safePage === 1}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Halaman pertama"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ‹ Sebelumnya
                  </button>

                  <div className="flex items-center gap-1 mx-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .reduce((acc, p, i, arr) => {
                        if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "…" ? (
                          <span key={`ellipsis-${i}`} className="px-1 text-[11px] text-gray-300">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-7 h-7 rounded-lg text-[11px] font-black transition-colors ${
                              p === safePage
                                ? "bg-[#046137] text-white"
                                : "text-gray-400 hover:bg-gray-100"
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}
                  </div>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Berikutnya ›
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={safePage === totalPages}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Halaman terakhir"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
