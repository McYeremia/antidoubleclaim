"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

const API_URL = "http://127.0.0.1:8000";

// ── Konstanta ─────────────────────────────────────────────────────────────────

const FAK_SHORT = {
  "Fakultas Teknologi Informasi":   "FTI",
  "Fakultas Bisnis":                "F. Bisnis",
  "Fakultas Bioteknologi":          "F. Bioteknologi",
  "Fakultas Kedokteran":            "F. Kedokteran",
  "Fakultas Arsitektur dan Desain": "F. Arsitektur & Desain",
  "Fakultas Humaniora":             "F. Humaniora",
};

const STATUS_CFG = {
  "Disetujui":      { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", numText: "text-emerald-900", dot: "bg-emerald-500" },
  "Ditolak":        { bg: "bg-red-50",     border: "border-red-100",     text: "text-red-600",     numText: "text-red-800",     dot: "bg-red-500"     },
  "Perlu Ditinjau": { bg: "bg-amber-50",   border: "border-amber-100",   text: "text-amber-600",   numText: "text-amber-800",   dot: "bg-amber-400"   },
  "Dalam Proses":   { bg: "bg-indigo-50",  border: "border-indigo-100",  text: "text-indigo-600",  numText: "text-indigo-800",  dot: "bg-indigo-500"  },
};

const STATUS_DONUT_COLOR = {
  "Disetujui":      "#10b981",
  "Ditolak":        "#ef4444",
  "Perlu Ditinjau": "#f59e0b",
  "Dalam Proses":   "#6366f1",
};

const JENIS_SHORT = {
  "Lomba Mandiri Puspresnas":     "Puspresnas",
  "Lomba Mandiri Non-Puspresnas": "Non-Puspresnas",
  "Rekognisi Non-Lomba":          "Rekognisi",
};

const PALETTE = ["#046137","#4f46e5","#0891b2","#d97706","#dc2626","#7c3aed","#0d9488","#ea580c"];

const EMPTY_FILTERS = { fakultas: "", prodi: "", tahun: "", tingkatan: "", kategori: "", kepesertaan: "" };

const FILTER_LABEL_MAP = {
  fakultas: "Fakultas", prodi: "Prodi", tahun: "Tahun",
  tingkatan: "Tingkatan", kategori: "Jenis", kepesertaan: "Kepesertaan",
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Sk({ className = "" }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <Sk key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-12 gap-5">
        <Sk className="col-span-8 h-52" />
        <Sk className="col-span-4 h-52" />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Sk className="h-44" /><Sk className="h-44" />
      </div>
      <Sk className="h-48" />
      <div className="grid grid-cols-3 gap-5">
        <Sk className="h-40" /><Sk className="h-40" /><Sk className="h-40" />
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ label, value, total, bg, border, text, numText }) {
  const pct = total > 0 && label !== "Total Klaim"
    ? Math.round((value / total) * 100) : null;
  return (
    <div className={`rounded-2xl border ${bg} ${border} px-5 py-4 flex flex-col justify-between h-[88px]`}>
      <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${text}`}>{label}</p>
      <div className="flex items-end justify-between">
        <p className={`text-[34px] font-black tabular-nums leading-none ${numText ?? text}`}>{value}</p>
        {pct !== null && (
          <span className={`text-[12px] font-bold ${text} opacity-70 mb-1`}>{pct}%</span>
        )}
      </div>
    </div>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
// Pilihan terbaik untuk data "bagian dari keseluruhan" (part-of-whole) dengan
// ≤6 kategori. Lubang tengah menampilkan total — information density tinggi
// (Stephen Few). Bar tertumpuk menyulitkan perbandingan segmen non-pertama.

function DonutChart({ data, total, colorFn, centerLabel = "Total", labelFn, compact = false }) {
  if (!data || data.length === 0)
    return <p className="text-[12px] text-gray-300 text-center py-10">Belum ada data.</p>;

  const SIZE = 160, CX = 80, CY = 80, R = 66, r = 46;
  const items = data.filter(d => d.count > 0);
  if (items.length === 0)
    return <p className="text-[12px] text-gray-300 text-center py-10">Belum ada data.</p>;

  let cum = -Math.PI / 2;
  const slices = items.map((d, i) => {
    const angle = total > 0 ? (d.count / total) * 2 * Math.PI : 0;
    const sa = cum;
    cum += angle;
    return { ...d, sa, ea: cum, color: colorFn ? colorFn(d.name) : PALETTE[i % PALETTE.length] };
  });

  const arcPath = (sa, ea) => {
    const large = (ea - sa) > Math.PI ? 1 : 0;
    const x1 = CX + R * Math.cos(sa), y1 = CY + R * Math.sin(sa);
    const x2 = CX + R * Math.cos(ea), y2 = CY + R * Math.sin(ea);
    const xi1 = CX + r * Math.cos(ea), yi1 = CY + r * Math.sin(ea);
    const xi2 = CX + r * Math.cos(sa), yi2 = CY + r * Math.sin(sa);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${xi1.toFixed(2)} ${yi1.toFixed(2)} A${r} ${r} 0 ${large} 0 ${xi2.toFixed(2)} ${yi2.toFixed(2)}Z`;
  };

  const svgClass = compact ? "w-[110px] h-[110px]" : "w-[130px] h-[130px]";

  return (
    <div className="flex items-center gap-5">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={`${svgClass} flex-shrink-0`}>
        {slices.map(s => {
          const span = s.ea - s.sa;
          if (span >= Math.PI * 2 - 0.001) {
            return (
              <g key={s.name}>
                <circle cx={CX} cy={CY} r={R} fill={s.color} />
                <circle cx={CX} cy={CY} r={r} fill="white" />
              </g>
            );
          }
          return (
            <path key={s.name} d={arcPath(s.sa, s.ea)}
              fill={s.color} stroke="white" strokeWidth="2.5">
              <title>{s.name}: {s.count}</title>
            </path>
          );
        })}
        <text x={CX} y={CY + 1} textAnchor="middle" fontSize="24" fontWeight="800"
          fill="#111827" fontFamily="system-ui" dominantBaseline="middle">{total}</text>
        <text x={CX} y={CY + 18} textAnchor="middle" fontSize="8.5" fill="#9ca3af"
          fontFamily="system-ui" fontWeight="700">{centerLabel}</text>
      </svg>
      <div className="flex-1 min-w-0 space-y-3">
        {slices.map(s => {
          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
          const label = labelFn ? labelFn(s.name) : s.name;
          return (
            <div key={s.name} className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <p className="text-[11px] text-gray-600 font-medium flex-1 leading-tight truncate min-w-0"
                title={label}>{label}</p>
              <span className="text-[12px] font-black text-gray-800 tabular-nums flex-shrink-0">{s.count}</span>
              <span className="text-[10px] text-gray-300 w-7 text-right tabular-nums flex-shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Split Bar ─────────────────────────────────────────────────────────────────
// Pilihan terbaik untuk data biner atau sedikit kategori (Tim / Individu).
// Segmented bar memperlihatkan rasio secara langsung. Angka besar menegaskan
// kategori dominan. Jauh lebih informatif daripada dua mini-bar terpisah.

function SplitBar({ data, total }) {
  if (!data || data.length === 0)
    return <p className="text-[12px] text-gray-300 text-center py-6">Belum ada data.</p>;
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden gap-px mb-5">
        {data.map((d, i) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          return pct > 0.3 ? (
            <div key={d.name} className="transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
              title={`${d.name}: ${d.count}`} />
          ) : null;
        })}
      </div>
      <div className="flex justify-around">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
          return (
            <div key={d.name} className="text-center">
              <p className="text-[32px] font-black tabular-nums leading-none"
                style={{ color: PALETTE[i % PALETTE.length] }}>{d.count}</p>
              <p className="text-[11px] text-gray-500 font-semibold mt-1.5">{d.name}</p>
              <p className="text-[10px] text-gray-300 tabular-nums mt-0.5">{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Trend Chart (Line) ────────────────────────────────────────────────────────
// Pilihan terbaik untuk data time-series (Tufte, Few). Garis menekankan
// kontinuitas perubahan antar waktu — bar chart akan memutus persepsi tren.

function TrendChart({ data }) {
  if (!data || data.length === 0)
    return <p className="text-[13px] text-gray-300 text-center py-10">Belum ada data.</p>;
  if (data.length === 1)
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-1">
        <p className="text-[52px] font-black text-[#046137] tabular-nums leading-none">{data[0].count}</p>
        <p className="text-[13px] text-gray-400 mt-2">{data[0].name}</p>
      </div>
    );

  const W = 480, H = 152;
  const P = { l: 30, r: 12, t: 22, b: 28 };
  const pw = W - P.l - P.r, ph = H - P.t - P.b;
  const maxV = Math.max(...data.map(d => d.count), 1);
  const range = maxV || 1;

  const pts = data.map((d, i) => ({
    x: P.l + (i / (data.length - 1)) * pw,
    y: P.t + (1 - d.count / range) * ph,
    label: d.name, count: d.count,
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1).x},${P.t + ph} L${pts[0].x},${P.t + ph}Z`;

  const ticks = [0, 0.5, 1].map(t => ({
    y: P.t + (1 - t) * ph, v: Math.round(t * range),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#046137" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#046137" stopOpacity="0"    />
        </linearGradient>
      </defs>
      {ticks.map(t => (
        <g key={t.y}>
          <line x1={P.l} y1={t.y} x2={W - P.r} y2={t.y} stroke="#f1f5f9" strokeWidth="1" />
          <text x={P.l - 5} y={t.y + 4} textAnchor="end" fontSize="9" fill="#cbd5e1" fontFamily="system-ui">{t.v}</text>
        </g>
      ))}
      <path d={area} fill="url(#trendFill)" />
      <path d={line}  fill="none" stroke="#046137" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(p => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="5"   fill="#046137" />
          <circle cx={p.x} cy={p.y} r="2.5" fill="white" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#046137" fontWeight="700" fontFamily="system-ui">{p.count}</text>
          <text x={p.x} y={H - 2}    textAnchor="middle" fontSize="9"  fill="#94a3b8" fontFamily="system-ui">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Horizontal Bar ────────────────────────────────────────────────────────────
// Pilihan terbaik untuk perbandingan magnitude antar kategori (Many vs Few),
// terutama bila label panjang. Bar horizontal > pie untuk perbandingan ranking
// karena manusia lebih akurat menilai panjang daripada sudut (Cleveland 1984).

function HBarChart({ data, formatLabel, maxItems = 8 }) {
  if (!data || data.length === 0)
    return <p className="text-[12px] text-gray-300 text-center py-8">Belum ada data.</p>;
  const items = data.slice(0, maxItems);
  const max   = Math.max(...items.map(d => d.count), 1);
  const sum   = items.reduce((s, d) => s + d.count, 0);
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const barPct = Math.max((item.count / max) * 100, 2);
        const relPct = sum > 0 ? Math.round((item.count / sum) * 100) : 0;
        return (
          <div key={item.name}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-gray-500 font-medium truncate max-w-[62%]" title={item.name}>
                {formatLabel ? formatLabel(item.name) : item.name}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black text-gray-700 tabular-nums">{item.count}</span>
                <span className="text-[10px] text-gray-300 tabular-nums w-7 text-right">{relPct}%</span>
              </div>
            </div>
            <div className="h-[5px] bg-gray-50 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${barPct}%`, backgroundColor: PALETTE[i % PALETTE.length], opacity: 0.8 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function HeatmapChart({ data }) {
  if (!data || !data.rows || data.rows.length === 0)
    return <p className="text-[12px] text-gray-300 text-center py-6">Belum ada data.</p>;
  const { rows, cols, cells, max } = data;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            <th className="text-left pb-3 pr-4 text-[9px] font-bold text-gray-300 uppercase tracking-widest min-w-[110px]">Fakultas</th>
            {cols.map(c => (
              <th key={c} className="pb-3 px-2 text-center font-bold text-gray-500 text-[12px]">{c}</th>
            ))}
            <th className="pb-3 pl-4 text-center text-[9px] font-bold text-gray-300 uppercase tracking-widest">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(fak => {
            const rowTotal = cols.reduce((s, c) => s + (cells[fak]?.[c] ?? 0), 0);
            return (
              <tr key={fak}>
                <td className="pr-4 py-1 text-gray-500 text-[11px] whitespace-nowrap align-middle font-medium">
                  {FAK_SHORT[fak] ?? fak}
                </td>
                {cols.map(c => {
                  const count = cells[fak]?.[c] ?? 0;
                  const t     = max > 0 ? count / max : 0;
                  const bg    = count === 0 ? "#f8fafc" : `rgba(4,97,55,${(0.08 + 0.82 * t).toFixed(2)})`;
                  const fg    = t > 0.48 ? "white" : (count === 0 ? "#d1d5db" : "#046137");
                  return (
                    <td key={c} className="px-1 py-1 align-middle">
                      <div className="rounded-lg flex items-center justify-center h-9 font-bold tabular-nums text-[13px] transition-colors"
                        style={{ backgroundColor: bg, color: fg, minWidth: "2.25rem" }}
                        title={`${FAK_SHORT[fak] ?? fak} · ${c}: ${count}`}
                      >
                        {count === 0 ? <span className="text-gray-200 font-normal text-[11px]">—</span> : count}
                      </div>
                    </td>
                  );
                })}
                <td className="pl-4 py-1 text-center font-black text-gray-700 text-[13px] align-middle">{rowTotal}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────

function ChartCard({ label, title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${className}`}>
      <div className="mb-4">
        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.22em]">{label}</p>
        <h2 className="text-[15px] font-black text-gray-900 mt-0.5 leading-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Filter Select ─────────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`text-[12px] border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all
          ${disabled ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                     : "bg-white text-gray-800 border-gray-200 hover:border-gray-300 cursor-pointer"}
          ${value ? "font-bold border-gray-800 bg-gray-50 text-gray-900" : "font-normal"}`}
      >
        <option value="">Semua</option>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  );
}

// ── Filter Chips ──────────────────────────────────────────────────────────────

function FilterChips({ filters, onRemove }) {
  const active = Object.entries(filters).filter(([, v]) => v);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-gray-50">
      {active.map(([k, v]) => (
        <span key={k}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-900 text-white rounded-full text-[11px] font-bold leading-none"
        >
          <span className="opacity-50">{FILTER_LABEL_MAP[k]}:</span> {v}
          <button onClick={() => onRemove(k)}
            className="opacity-50 hover:opacity-100 transition-opacity ml-0.5 flex-shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ className = "w-4 h-4" }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VisualisasiDataOperator() {
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [filters,      setFilters]      = useState(EMPTY_FILTERS);
  const [filterOpts,   setFilterOpts]   = useState(null);
  const [exporting,    setExporting]    = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

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
      .then(r => r.ok ? r.json() : Promise.reject("Gagal memuat data"))
      .then(data => {
        setStats(data);
        if (!Object.values(f).some(Boolean)) setFilterOpts(data.filter_options);
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [buildParams]);

  useEffect(() => { fetchStats(EMPTY_FILTERS); }, [fetchStats]);

  const setFilter = (key, val) => {
    const next = { ...filters, [key]: val };
    if (key === "fakultas") next.prodi = "";
    setFilters(next);
    fetchStats(next);
  };

  const removeFilter = (key) => {
    const next = { ...filters, [key]: "" };
    if (key === "fakultas") next.prodi = "";
    setFilters(next);
    fetchStats(next);
  };

  const resetFilters = () => { setFilters(EMPTY_FILTERS); fetchStats(EMPTY_FILTERS); };

  // ── Export Excel ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const qs  = buildParams(filters);
      const res = await fetch(`${API_URL}/stats/export${qs ? "?" + qs : ""}`);
      const data = await res.json();
      if (!data || data.length === 0) { alert("Tidak ada data untuk diekspor."); return; }
      const ws = XLSX.utils.json_to_sheet(data);
      const keys = Object.keys(data[0]);
      ws["!cols"] = keys.map(k => ({ wch: Math.max(k.length + 2, 16) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Klaim");
      const filterLabel = Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}-${v}`).join("_") || "semua";
      XLSX.writeFile(wb, `klaim_${filterLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      alert("Gagal mengekspor data: " + e);
    } finally {
      setExporting(false);
    }
  };

  // ── Export PDF ────────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const qs  = buildParams(filters);
      const res = await fetch(`${API_URL}/stats/export${qs ? "?" + qs : ""}`);
      const data = await res.json();
      if (!data || data.length === 0) { alert("Tidak ada data untuk diekspor."); return; }

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc    = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const PW = 297, PH = 210, M = 12;
      const GREEN = [4, 97, 55];
      const _BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

      const fmtNow = () => {
        const d = new Date();
        return `${d.getDate()} ${_BULAN[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
      };

      const drawHeader = () => {
        doc.setFillColor(...GREEN);
        doc.rect(0, 0, PW, 22, "F");
        doc.setFont("helvetica", "bold");   doc.setFontSize(13); doc.setTextColor(255,255,255);
        doc.text("UKDW", M, 9);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7);  doc.setTextColor(180,220,200);
        doc.text("Universitas Kristen Duta Wacana", M, 14);
        doc.text("Kemahasiswaan — Divisi Bakat Minat", M, 18.5);
        doc.setFont("helvetica", "bold");   doc.setFontSize(12); doc.setTextColor(255,255,255);
        doc.text("LAPORAN DATA KLAIM SERTIFIKAT", PW - M, 9.5, { align: "right" });
        doc.setFont("helvetica", "normal"); doc.setFontSize(7);  doc.setTextColor(180,220,200);
        doc.text(`Digenerate pada: ${fmtNow()}`, PW - M, 15, { align: "right" });
        const af = Object.entries(filters).filter(([,v]) => v);
        if (af.length > 0) {
          const str = af.map(([k,v]) => `${FILTER_LABEL_MAP[k] ?? k}: ${v}`).join("  ·  ");
          doc.setFontSize(6.5);
          doc.text(`Filter: ${str}`, PW - M, 19.5, { align: "right" });
        }
      };

      const drawFooter = (pageNum, totalPages) => {
        doc.setDrawColor(226,232,240); doc.setLineWidth(0.3);
        doc.line(M, PH - 8, PW - M, PH - 8);
        doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(156,163,175);
        doc.text("Kemahasiswaan UKDW  ·  Laporan Data Klaim Sertifikat", M, PH - 4.5);
        doc.text(`Halaman ${pageNum} dari ${totalPages}`, PW - M, PH - 4.5, { align: "right" });
      };

      drawHeader();

      const sMap = Object.fromEntries((stats?.by_status ?? []).map(d => [d.name, d.count]));
      const total = stats?.total ?? data.length;
      const boxes = [
        { label: "Total Klaim",    value: total,                        color: [55,65,81]   },
        { label: "Disetujui",      value: sMap["Disetujui"]      ?? 0,  color: [4,97,55]    },
        { label: "Dalam Proses",   value: sMap["Dalam Proses"]   ?? 0,  color: [79,70,229]  },
        { label: "Perlu Ditinjau", value: sMap["Perlu Ditinjau"] ?? 0,  color: [180,83,9]   },
        { label: "Ditolak",        value: sMap["Ditolak"]        ?? 0,  color: [185,28,28]  },
      ];
      const BY = 25, BH = 14, BW = (PW - M * 2 - 4 * 3) / 5;
      boxes.forEach((b, i) => {
        const x = M + i * (BW + 3);
        doc.setFillColor(248,250,252); doc.setDrawColor(226,232,240); doc.setLineWidth(0.3);
        doc.roundedRect(x, BY, BW, BH, 2, 2, "FD");
        doc.setFillColor(...b.color); doc.roundedRect(x, BY, 2.5, BH, 1, 1, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(...b.color);
        doc.text(String(b.value), x + BW / 2 + 1.25, BY + 8.5, { align: "center" });
        doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(107,114,128);
        doc.text(b.label, x + BW / 2 + 1.25, BY + 12.5, { align: "center" });
      });

      const HEAD_COLS = ["No.","NIM","Nama Mahasiswa","Fakultas","Program Studi","Nama Kegiatan","Tingkatan","Tahun","Kepesertaan","Kategori SIMKATMAWA","Capaian","Status","Diverifikasi Oleh","Tgl. Verifikasi"];
      const COL_W = [7,17,24,18,22,35,16,10,16,28,16,16,20,26];
      const body  = data.map((r, i) => [i+1, r["NIM"]??"", r["Nama Mahasiswa"]??"", r["Fakultas"]??"", r["Program Studi"]??"", r["Nama Kegiatan"]??"", r["Tingkatan"]??"", r["Tahun Kegiatan"]??"", r["Jenis Kepesertaan"]??"", r["Kategori SIMKATMAWA"]??"", r["Capaian / Peringkat"]??"", r["Status Klaim"]??"", r["Diverifikasi Oleh"]??"", r["Tanggal Verifikasi"]??""]);

      autoTable(doc, {
        head: [HEAD_COLS], body,
        startY: BY + BH + 4, margin: { left: M, right: M, bottom: 14 },
        styles: { fontSize: 7, cellPadding: { top: 2, bottom: 2, left: 2, right: 2 }, lineColor: [226,232,240], lineWidth: 0.2, textColor: [55,65,81], font: "helvetica", overflow: "ellipsize" },
        headStyles: { fillColor: GREEN, textColor: [255,255,255], fontStyle: "bold", fontSize: 7, halign: "center" },
        alternateRowStyles: { fillColor: [249,250,251] },
        columnStyles: Object.fromEntries(COL_W.map((w,i) => [i, { cellWidth: w, halign: i === 0 ? "center" : "left" }])),
        didParseCell: (info) => {
          if (info.section === "body" && info.column.index === 11) {
            const s = info.cell.raw;
            if (s === "Disetujui")           { info.cell.styles.textColor = [4,97,55];    info.cell.styles.fontStyle = "bold"; }
            else if (s === "Ditolak")        { info.cell.styles.textColor = [185,28,28];  info.cell.styles.fontStyle = "bold"; }
            else if (s === "Perlu Ditinjau") { info.cell.styles.textColor = [180,83,9];   info.cell.styles.fontStyle = "bold"; }
          }
        },
        didDrawPage: ({ pageNumber }) => { if (pageNumber > 1) drawHeader(); },
      });

      const totalPages = doc.getNumberOfPages();
      for (let pg = 1; pg <= totalPages; pg++) { doc.setPage(pg); drawFooter(pg, totalPages); }

      const fl = Object.entries(filters).filter(([,v]) => v).map(([k,v]) => `${k}-${v}`).join("_") || "semua";
      doc.save(`klaim_${fl}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      alert("Gagal mengekspor PDF: " + e);
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────────
  const activeCount  = Object.values(filters).filter(Boolean).length;
  const prodiOptions = filters.fakultas
    ? (filterOpts?.prodi_by_fakultas?.[filters.fakultas] ?? [])
    : Object.values(filterOpts?.prodi_by_fakultas ?? {}).flat();

  const statusMap = Object.fromEntries((stats?.by_status ?? []).map(d => [d.name, d.count]));
  const kpiItems  = [
    { label: "Total Klaim",    value: stats?.total ?? 0,                 bg: "bg-gray-50",    border: "border-gray-100",   text: "text-gray-400",   numText: "text-gray-800" },
    { label: "Disetujui",      value: statusMap["Disetujui"]      ?? 0,  ...STATUS_CFG["Disetujui"]      },
    { label: "Ditolak",        value: statusMap["Ditolak"]        ?? 0,  ...STATUS_CFG["Ditolak"]        },
    { label: "Perlu Ditinjau", value: statusMap["Perlu Ditinjau"] ?? 0,  ...STATUS_CFG["Perlu Ditinjau"] },
    { label: "Dalam Proses",   value: statusMap["Dalam Proses"]   ?? 0,  ...STATUS_CFG["Dalam Proses"]   },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Visualisasi Data</h1>
          <p className="text-gray-400 mt-3 text-[14px]">
            Statistik klaim sertifikat — filter lalu export ke Excel atau PDF.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0 mt-1">
          <button onClick={handleExport} disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {exporting ? <Spinner className="w-4 h-4 text-gray-400" />
              : <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>}
            {exporting ? "Mengekspor..." : "Excel"}
          </button>
          <button onClick={handleExportPDF} disabled={exportingPdf || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#046137] text-white text-[13px] font-semibold rounded-xl hover:bg-[#035230] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {exportingPdf ? <Spinner className="w-4 h-4" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>}
            {exportingPdf ? "Membuat PDF..." : "PDF"}
          </button>
        </div>
      </div>

      {/* ── Filter Panel ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Filter Data</p>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gray-900 text-white tabular-nums">
                {activeCount}
              </span>
            )}
          </div>
          {activeCount > 0 && (
            <button onClick={resetFilters}
              className="text-[11px] font-bold text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reset semua
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
          <FilterSelect label="Tahun"          value={filters.tahun}       onChange={v => setFilter("tahun", v)}        options={filterOpts?.tahun ?? []} />
          <FilterSelect label="Fakultas"       value={filters.fakultas}    onChange={v => setFilter("fakultas", v)}     options={(filterOpts?.fakultas ?? []).map(f => ({ value: f, label: FAK_SHORT[f] ?? f }))} />
          <FilterSelect label="Prodi"          value={filters.prodi}       onChange={v => setFilter("prodi", v)}        options={prodiOptions} disabled={prodiOptions.length === 0} />
          <FilterSelect label="Tingkatan"      value={filters.tingkatan}   onChange={v => setFilter("tingkatan", v)}    options={filterOpts?.tingkatan ?? []} />
          <FilterSelect label="Jenis Kegiatan" value={filters.kategori}    onChange={v => setFilter("kategori", v)}     options={[
            { value: "lomba_mandiri_puspresnas",     label: "Lomba Mandiri Puspresnas"     },
            { value: "lomba_mandiri_non_puspresnas", label: "Lomba Mandiri Non-Puspresnas" },
            { value: "rekognisi",                    label: "Rekognisi Non-Lomba"          },
          ]} />
          <FilterSelect label="Kepesertaan"    value={filters.kepesertaan} onChange={v => setFilter("kepesertaan", v)}  options={filterOpts?.kepesertaan ?? []} />
        </div>
        <FilterChips filters={filters} onRemove={removeFilter} />
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-red-100 shadow-sm">
          <svg className="w-9 h-9 text-red-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[13px] font-bold text-red-500">Gagal memuat data statistik.</p>
          <p className="text-[11px] text-gray-400 mt-1">{error}</p>
          <button onClick={() => fetchStats(filters)}
            className="mt-5 px-5 py-2 rounded-xl text-[12px] font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
            Coba Lagi
          </button>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Row 1 — KPI Cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-5 gap-4">
            {kpiItems.map(k => (
              <KPICard key={k.label} {...k} total={stats.total} />
            ))}
          </div>

          {/* Row 2 — Tren + Donut Status ────────────────────────────────────── */}
          <div className="grid grid-cols-12 gap-5">
            <ChartCard label="Tren" title="Klaim per Tahun" className="col-span-8">
              <TrendChart data={stats.by_tahun} />
            </ChartCard>
            <ChartCard label="Distribusi" title="Status Klaim" className="col-span-4">
              <DonutChart
                data={stats.by_status}
                total={stats.total}
                colorFn={n => STATUS_DONUT_COLOR[n] ?? "#94a3b8"}
                centerLabel="Klaim"
                compact
              />
            </ChartCard>
          </div>

          {/* Row 3 — Fakultas + Donut Jenis Kegiatan ───────────────────────── */}
          <div className="grid grid-cols-2 gap-5">
            <ChartCard label="Distribusi" title="Per Fakultas">
              <HBarChart data={stats.by_fakultas} formatLabel={n => FAK_SHORT[n] ?? n} maxItems={7} />
            </ChartCard>
            <ChartCard label="Komposisi" title="Jenis Kegiatan">
              <DonutChart
                data={stats.by_jenis}
                total={stats.total}
                centerLabel="Klaim"
                labelFn={n => JENIS_SHORT[n] ?? n}
              />
            </ChartCard>
          </div>

          {/* Row 4 — Heatmap ─────────────────────────────────────────────────── */}
          <ChartCard label="Sebaran" title="Klaim per Fakultas × Tahun">
            <HeatmapChart data={stats.heatmap} />
          </ChartCard>

          {/* Row 5 — Prodi + Tingkatan + Split Kepesertaan ─────────────────── */}
          <div className="grid grid-cols-3 gap-5">
            <ChartCard label="Distribusi" title="Program Studi">
              <HBarChart data={stats.by_prodi} maxItems={8} />
            </ChartCard>
            <ChartCard label="Distribusi" title="Tingkatan Lomba">
              <HBarChart data={stats.by_tingkatan} maxItems={6} />
            </ChartCard>
            <ChartCard label="Proporsi" title="Jenis Kepesertaan">
              <SplitBar data={stats.by_kepesertaan} total={stats.total} />
            </ChartCard>
          </div>

        </div>
      )}
    </div>
  );
}
