"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

const API_URL = "http://127.0.0.1:8000";

// ── Konstanta ────────────────────────────────────────────────────────────────

const FAK_SHORT = {
  "Fakultas Teknologi Informasi":   "FTI",
  "Fakultas Bisnis":                "F. Bisnis",
  "Fakultas Bioteknologi":          "F. Bioteknologi",
  "Fakultas Kedokteran":            "F. Kedokteran",
  "Fakultas Arsitektur dan Desain": "F. Arsitektur & Desain",
  "Fakultas Humaniora":             "F. Humaniora",
};

const CHART_COLORS = [
  "bg-[#046137]", "bg-violet-500", "bg-emerald-500", "bg-amber-400",
  "bg-rose-400",  "bg-sky-400",   "bg-fuchsia-400", "bg-teal-500",
];

const STATUS_CONFIG = {
  "Disetujui":      { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", num: "text-emerald-800", dot: "bg-emerald-500" },
  "Dalam Proses":   { bg: "bg-[#f0f7f3]", border: "border-[#d4ebe0]",   text: "text-[#046137]",   num: "text-[#035230]",   dot: "bg-[#046137]"   },
  "Perlu Ditinjau": { bg: "bg-amber-50",   border: "border-amber-100",   text: "text-amber-700",   num: "text-amber-800",   dot: "bg-amber-500"   },
  "Ditolak":        { bg: "bg-red-50",     border: "border-red-100",     text: "text-red-600",     num: "text-red-700",     dot: "bg-red-400"     },
};
const STATUS_ORDER = ["Disetujui", "Ditolak"];

// ── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ data, formatLabel }) {
  if (!data || data.length === 0)
    return <p className="text-sm text-gray-400 text-center py-8">Belum ada data.</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2.5">
      {data.map((item, i) => (
        <div key={item.name} className="flex items-center gap-3">
          <p className="text-[12px] text-gray-600 w-40 flex-shrink-0 truncate" title={item.name}>
            {formatLabel ? formatLabel(item.name) : item.name}
          </p>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${CHART_COLORS[i % CHART_COLORS.length]}`}
                style={{ width: `${Math.max((item.count / max) * 100, 4)}%` }}
              />
            </div>
            <span className="text-[12px] font-semibold text-gray-700 w-6 text-right tabular-nums">
              {item.count}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Progress List ────────────────────────────────────────────────────────────

function ProgressList({ data, total }) {
  if (!data || data.length === 0)
    return <p className="text-sm text-gray-400 text-center py-8">Belum ada data.</p>;
  const bars  = ["bg-[#046137]",      "bg-violet-500",  "bg-emerald-500", "bg-amber-400",  "bg-gray-300"];
  const dots  = ["bg-[#046137]",      "bg-violet-500",  "bg-emerald-500", "bg-amber-400",  "bg-gray-300"];
  const texts = ["text-[#046137]", "text-violet-600","text-emerald-600","text-amber-600","text-gray-400"];
  return (
    <div className="space-y-3.5">
      {data.map((item, i) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dots[i] ?? "bg-gray-300"}`} />
              <p className="text-[13px] text-gray-700 truncate">{item.name}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-28 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className={`h-full rounded-full ${bars[i] ?? "bg-gray-300"}`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`text-[12px] font-semibold w-16 text-right tabular-nums ${texts[i] ?? "text-gray-500"}`}>
                {item.count} <span className="font-normal text-gray-400">({pct}%)</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Line Chart ───────────────────────────────────────────────────────────────

function LineChart({ data }) {
  if (!data || data.length === 0)
    return <p className="text-sm text-gray-400 text-center py-8">Belum ada data.</p>;
  if (data.length === 1)
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-1">
        <p className="text-5xl font-black text-violet-500 tabular-nums">{data[0].count}</p>
        <p className="text-sm text-gray-400">{data[0].name}</p>
      </div>
    );

  const W = 360, H = 148;
  const PAD = { l: 28, r: 12, t: 20, b: 28 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  const pts = data.map((d, i) => ({
    x: PAD.l + (i / (data.length - 1)) * plotW,
    y: PAD.t + (1 - d.count / maxVal) * plotH,
    label: d.name,
    count: d.count,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${pts.at(-1).x},${PAD.t + plotH} L${pts[0].x},${PAD.t + plotH}Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      <defs>
        <linearGradient id="areaGradOp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"    />
        </linearGradient>
      </defs>
      {[0, 0.33, 0.66, 1].map((t) => {
        const y = PAD.t + (1 - t) * plotH;
        return (
          <g key={t}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD.l - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#d1d5db" fontFamily="inherit">
              {Math.round(t * maxVal)}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#areaGradOp)" />
      <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="#8b5cf6" />
          <circle cx={p.x} cy={p.y} r="2"   fill="white" />
          <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="10" fill="#7c3aed" fontWeight="700" fontFamily="inherit">
            {p.count}
          </text>
        </g>
      ))}
      {pts.map((p) => (
        <text key={p.label} x={p.x} y={H - 2} textAnchor="middle" fontSize="10" fill="#9ca3af" fontFamily="inherit">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// ── Heatmap ──────────────────────────────────────────────────────────────────

function HeatmapChart({ data }) {
  if (!data || !data.rows || data.rows.length === 0)
    return <p className="text-sm text-gray-400 text-center py-8">Belum ada data.</p>;
  const { rows, cols, cells, max } = data;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            <th className="text-left pb-3 pr-4 font-semibold text-gray-400 text-[11px] uppercase tracking-wider w-36">Fakultas</th>
            {cols.map((c) => (
              <th key={c} className="pb-3 px-1 text-center font-semibold text-gray-600 text-[12px]">{c}</th>
            ))}
            <th className="pb-3 pl-3 text-center font-semibold text-gray-400 text-[11px] uppercase tracking-wider">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((fak) => {
            const rowTotal = cols.reduce((s, c) => s + (cells[fak]?.[c] ?? 0), 0);
            return (
              <tr key={fak}>
                <td className="pr-4 py-1 text-gray-600 text-[11px] whitespace-nowrap align-middle">
                  {FAK_SHORT[fak] ?? fak}
                </td>
                {cols.map((c) => {
                  const count     = cells[fak]?.[c] ?? 0;
                  const intensity = max > 0 ? count / max : 0;
                  const bg = count === 0
                    ? "#f9fafb"
                    : `rgba(99, 102, 241, ${0.12 + 0.82 * intensity})`;
                  const fg = intensity > 0.55 ? "white" : (count === 0 ? "#d1d5db" : "#3730a3");
                  return (
                    <td key={c} className="px-1 py-1 align-middle">
                      <div
                        className="rounded-xl flex items-center justify-center h-9 font-bold tabular-nums text-[13px]"
                        style={{ backgroundColor: bg, color: fg, minWidth: "2.5rem" }}
                        title={`${FAK_SHORT[fak] ?? fak} · ${c}: ${count} klaim`}
                      >
                        {count === 0 ? <span className="text-gray-300 font-normal">—</span> : count}
                      </div>
                    </td>
                  );
                })}
                <td className="pl-3 py-1 text-center font-black text-gray-800 text-[13px] align-middle">
                  {rowTotal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Status Breakdown Card ────────────────────────────────────────────────────

function StatusBreakdown({ data, total }) {
  const dataMap = Object.fromEntries((data ?? []).map((d) => [d.name, d.count]));
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Total */}
      <div className="rounded-2xl border bg-gray-50 border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-400" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Total Klaim</p>
        </div>
        <p className="text-3xl font-black tabular-nums leading-none text-gray-800">{total}</p>
        <p className="text-[12px] text-gray-400 mt-1.5">keseluruhan data</p>
      </div>

      {/* Disetujui & Ditolak */}
      {STATUS_ORDER.map((name) => {
        const count = dataMap[name] ?? 0;
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
        const cfg   = STATUS_CONFIG[name];
        return (
          <div key={name} className={`rounded-2xl border ${cfg.bg} ${cfg.border} px-5 py-4`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <p className={`text-[11px] font-bold uppercase tracking-widest ${cfg.text}`}>{name}</p>
            </div>
            <p className={`text-3xl font-black tabular-nums leading-none ${cfg.num}`}>{count}</p>
            <p className="text-[12px] text-gray-400 mt-1.5">{pct}% dari total</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Chart Card ───────────────────────────────────────────────────────────────

function ChartCard({ label, title, children, fullWidth = false }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${fullWidth ? "col-span-2" : ""}`}>
      <div className="mb-5">
        <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">{label}</p>
        <h2 className="text-base font-bold text-gray-900 mt-0.5">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Filter Select ────────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`text-[13px] border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors
          ${disabled
            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
            : "bg-white text-gray-800 border-gray-200 cursor-pointer hover:border-gray-300"}
          ${value ? "font-semibold border-gray-900 text-gray-900" : "font-normal"}`}
      >
        <option value="">Semua</option>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  );
}

// ── Komponen Utama ───────────────────────────────────────────────────────────

const EMPTY_FILTERS = {
  fakultas: "", prodi: "", tahun: "", tingkatan: "", kategori: "", kepesertaan: "",
};

export default function VisualisasiDataOperator() {
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [filters,    setFilters]    = useState(EMPTY_FILTERS);
  const [filterOpts, setFilterOpts] = useState(null);
  const [exporting,  setExporting]  = useState(false);

  const buildParams = useCallback((f) => {
    const p = new URLSearchParams();
    if (f.fakultas)    p.set("fakultas",    f.fakultas);
    if (f.prodi)       p.set("prodi",       f.prodi);
    if (f.tahun)       p.set("tahun",       f.tahun);
    if (f.tingkatan)   p.set("tingkatan",   f.tingkatan);
    if (f.kategori)    p.set("kategori",    f.kategori);
    if (f.kepesertaan) p.set("kepesertaan", f.kepesertaan);
    return p.toString();
  }, []);

  const fetchStats = useCallback((f) => {
    setLoading(true);
    const qs = buildParams(f);
    fetch(`${API_URL}/stats/visualisasi${qs ? "?" + qs : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject("Gagal memuat data")))
      .then((data) => {
        setStats(data);
        if (!Object.values(f).some(Boolean)) setFilterOpts(data.filter_options);
        setLoading(false);
      })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [buildParams]);

  useEffect(() => { fetchStats(EMPTY_FILTERS); }, [fetchStats]);

  const setFilter = (key, val) => {
    const next = { ...filters, [key]: val };
    if (key === "fakultas") next.prodi = "";
    setFilters(next);
    fetchStats(next);
  };

  const resetFilters = () => { setFilters(EMPTY_FILTERS); fetchStats(EMPTY_FILTERS); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const qs  = buildParams(filters);
      const res = await fetch(`${API_URL}/stats/export${qs ? "?" + qs : ""}`);
      const data = await res.json();

      if (!data || data.length === 0) {
        alert("Tidak ada data untuk diekspor.");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);

      // Lebar kolom otomatis
      const keys = Object.keys(data[0]);
      ws["!cols"] = keys.map((k) => ({
        wch: Math.max(k.length + 2, 16),
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Klaim");

      const filterLabel = Object.entries(filters)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}-${v}`)
        .join("_") || "semua";
      const tanggal = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `klaim_${filterLabel}_${tanggal}.xlsx`);
    } catch (e) {
      alert("Gagal mengekspor data: " + e);
    } finally {
      setExporting(false);
    }
  };

  const activeCount  = Object.values(filters).filter(Boolean).length;
  const prodiOptions = filters.fakultas
    ? (filterOpts?.prodi_by_fakultas?.[filters.fakultas] ?? [])
    : Object.values(filterOpts?.prodi_by_fakultas ?? {}).flat();

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">
            Visualisasi Data
          </h1>
          <p className="text-gray-400 mt-3 text-[14px]">
            Statistik klaim sertifikat — filter data lalu export ke Excel jika diperlukan.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="flex items-center gap-2.5 px-5 py-2.5 bg-[#046137] text-white text-[13px] font-semibold rounded-xl hover:bg-[#035230] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 mt-1"
        >
          {exporting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          {exporting ? "Mengekspor..." : "Export Excel"}
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">Filter Data</p>
          {activeCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reset {activeCount} filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
          <FilterSelect label="Tahun"          value={filters.tahun}       onChange={(v) => setFilter("tahun", v)}        options={filterOpts?.tahun ?? []} />
          <FilterSelect label="Fakultas"       value={filters.fakultas}    onChange={(v) => setFilter("fakultas", v)}     options={(filterOpts?.fakultas ?? []).map((f) => ({ value: f, label: FAK_SHORT[f] ?? f }))} />
          <FilterSelect label="Prodi"          value={filters.prodi}       onChange={(v) => setFilter("prodi", v)}        options={prodiOptions} disabled={prodiOptions.length === 0} />
          <FilterSelect label="Tingkatan"      value={filters.tingkatan}   onChange={(v) => setFilter("tingkatan", v)}    options={filterOpts?.tingkatan ?? []} />
          <FilterSelect label="Jenis Kegiatan" value={filters.kategori}    onChange={(v) => setFilter("kategori", v)}     options={[
                { value: "lomba_mandiri_puspresnas",     label: "Lomba Mandiri Puspresnas"     },
                { value: "lomba_mandiri_non_puspresnas", label: "Lomba Mandiri Non-Puspresnas" },
                { value: "rekognisi",                    label: "Rekognisi Non-Lomba"          },
              ]} />
          <FilterSelect label="Kepesertaan"    value={filters.kepesertaan} onChange={(v) => setFilter("kepesertaan", v)}  options={filterOpts?.kepesertaan ?? []} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
        <div className="space-y-5">

          {/* Status Breakdown — full width */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-5">
              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Ringkasan</p>
              <h2 className="text-base font-bold text-gray-900 mt-0.5">Status Klaim</h2>
            </div>
            <StatusBreakdown data={stats.by_status} total={stats.total} />
          </div>

          {/* Chart grid */}
          <div className="grid grid-cols-2 gap-5">

            <ChartCard label="Berdasarkan" title="Fakultas">
              <BarChart data={stats.by_fakultas} formatLabel={(n) => FAK_SHORT[n] ?? n} />
            </ChartCard>
            <ChartCard label="Berdasarkan" title="Program Studi">
              <BarChart data={stats.by_prodi} />
            </ChartCard>

            <ChartCard label="Tren" title="Klaim per Tahun">
              <LineChart data={stats.by_tahun} />
            </ChartCard>
            <ChartCard label="Berdasarkan" title="Tingkatan Lomba">
              <BarChart data={stats.by_tingkatan} />
            </ChartCard>

            <ChartCard label="Berdasarkan" title="Jenis Kegiatan">
              <ProgressList data={stats.by_jenis} total={stats.total} />
            </ChartCard>
            <ChartCard label="Berdasarkan" title="Jenis Kepesertaan">
              <ProgressList data={stats.by_kepesertaan} total={stats.total} />
            </ChartCard>

            <ChartCard label="Sebaran" title="Klaim per Fakultas × Tahun" fullWidth>
              <HeatmapChart data={stats.heatmap} />
            </ChartCard>

          </div>
        </div>
      )}
    </div>
  );
}
