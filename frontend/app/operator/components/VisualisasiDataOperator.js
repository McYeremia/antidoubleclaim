"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const apiFetch = (url, options = {}) => fetch(url, { ...options, headers: { "ngrok-skip-browser-warning": "true", ...(options.headers || {}) } });

// ── Konstanta ─────────────────────────────────────────────────────────────────

const FAK_SHORT = {
  "Fakultas Teknologi Informasi":   "Fakultas Teknologi Informasi",
  "Fakultas Bisnis":                "Fakultas Bisnis",
  "Fakultas Bioteknologi":          "Fakultas Bioteknologi",
  "Fakultas Kedokteran":            "Fakultas Kedokteran",
  "Fakultas Arsitektur dan Desain": "Fakultas Arsitektur dan Desain",
  "Fakultas Humaniora":             "Fakultas Humaniora",
};

const FAK_ABBR = {
  "Fakultas Teknologi Informasi":   "FTI",
  "Fakultas Bisnis":                "Bisnis",
  "Fakultas Bioteknologi":          "Bioteknologi",
  "Fakultas Kedokteran":            "Kedokteran",
  "Fakultas Arsitektur dan Desain": "Arsitektur",
  "Fakultas Humaniora":             "Humaniora",
};

const JENIS_SHORT = {
  "Lomba Mandiri Puspresnas":     "Puspresnas",
  "Lomba Mandiri Non-Puspresnas": "Non-Puspresnas",
  "Rekognisi Non-Lomba":          "Rekognisi",
};

const FAK_COLOR = {
  "Fakultas Teologi":                    "#9333ea",
  "Fakultas Bisnis":                     "#FDD100",
  "Fakultas Bioteknologi":               "#046137",
  "Fakultas Kedokteran":                 "#e2e8f0",
  "Fakultas Arsitektur dan Desain":      "#3b82f6",
  "Fakultas Teknologi Informasi":        "#6b7280",
  "Fakultas Kependidikan dan Humaniora": "#f97316",
  "Fakultas Humaniora":                  "#f97316",
};

const PRODI_FAK = {
  "Prodi Filsafat Keilahian":        "Fakultas Teologi",
  "Prodi Manajemen":                 "Fakultas Bisnis",
  "Prodi Akuntansi":                 "Fakultas Bisnis",
  "Prodi Biologi":                   "Fakultas Bioteknologi",
  "Prodi Kedokteran":                "Fakultas Kedokteran",
  "Prodi Arsitektur":                "Fakultas Arsitektur dan Desain",
  "Prodi Desain Produk":             "Fakultas Arsitektur dan Desain",
  "Prodi Informatika":               "Fakultas Teknologi Informasi",
  "Prodi Sistem Informasi":          "Fakultas Teknologi Informasi",
  "Prodi Pendidikan Bahasa Inggris": "Fakultas Kependidikan dan Humaniora",
  "Prodi Studi Humanitas":           "Fakultas Kependidikan dan Humaniora",
};

// Warna turunan per prodi — shade gelap & terang dari warna fakultas induk
const PRODI_COLOR = {
  // Teologi → ungu
  "Prodi Filsafat Keilahian":        "#9333ea",
  // Bisnis → kuning (gelap & terang)
  "Prodi Manajemen":                 "#FDD100",
  "Prodi Akuntansi":                 "#D4A800",
  // Bioteknologi → hijau
  "Prodi Biologi":                   "#046137",
  // Kedokteran → slate
  "Prodi Kedokteran":                "#cbd5e1",
  // Arsitektur dan Desain → biru (gelap & terang)
  "Prodi Arsitektur":                "#2563eb",
  "Prodi Desain Produk":             "#60a5fa",
  // Teknologi Informasi → abu-abu (gelap & terang)
  "Prodi Informatika":               "#4b5563",
  "Prodi Sistem Informasi":          "#9ca3af",
  // Kependidikan dan Humaniora → oranye (gelap & terang)
  "Prodi Pendidikan Bahasa Inggris": "#ea580c",
  "Prodi Studi Humanitas":           "#fb923c",
};

const JENIS_COLOR = {
  "Lomba Mandiri Puspresnas":     "#046137",
  "Lomba Mandiri Non-Puspresnas": "#0d9488",
  "Rekognisi Non-Lomba":          "#b45309",
};

const PALETTE = ["#046137","#4f46e5","#0891b2","#d97706","#dc2626","#7c3aed","#0d9488","#ea580c"];

// Palet hijau bertingkat untuk chart Periode & Tingkatan
const GREEN_SHADES = ["#046137","#0a7a4a","#10a063","#2db87a","#5bcc96","#8ddbb4"];

const EMPTY_FILTERS = { fakultas: "", prodi: "", tahun: "", tingkatan: "", kategori: "", periode: "" };

const FILTER_LABEL_MAP = {
  fakultas: "Fakultas", prodi: "Prodi", tahun: "Tahun",
  tingkatan: "Tingkatan", kategori: "Jenis", periode: "Periode",
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Sk({ className = "" }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Sk key={i} className="h-[88px]" />)}
      </div>
      <div className="grid grid-cols-12 gap-5">
        <Sk className="col-span-7 h-56" />
        <Sk className="col-span-5 h-56" />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Sk className="h-48" /><Sk className="h-48" />
      </div>
      <Sk className="h-52" />
      <div className="grid grid-cols-2 gap-5">
        <Sk className="h-44" /><Sk className="h-44" />
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ label, value, total, bg, border, text, numText }) {
  const pct = total > 0 && label !== "Total Disetujui"
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

function DonutChart({ data, total, colorFn, centerLabel = "Total", labelFn }) {
  if (!data || data.length === 0)
    return <p className="text-[12px] text-gray-300 text-center py-10">Belum ada data.</p>;

  const SIZE = 160, CX = 80, CY = 80, R = 66, r = 46;
  const items = data.filter(d => d.count > 0);
  if (items.length === 0)
    return <p className="text-[12px] text-gray-300 text-center py-10">Belum ada data.</p>;

  let cum = -Math.PI / 2;
  const slices = items.map((d, i) => {
    const angle = total > 0 ? (d.count / total) * 2 * Math.PI : 0;
    const sa = cum; cum += angle;
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

  return (
    <div className="flex items-center gap-5">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-[130px] h-[130px] flex-shrink-0">
        {slices.map(s => {
          if (s.ea - s.sa >= Math.PI * 2 - 0.001) return (
            <g key={s.name}>
              <circle cx={CX} cy={CY} r={R} fill={s.color} />
              <circle cx={CX} cy={CY} r={r} fill="white" />
            </g>
          );
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

// ── Trend Chart (smooth bezier) ───────────────────────────────────────────────

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

  const pts = data.map((d, i) => ({
    x: P.l + (i / (data.length - 1)) * pw,
    y: P.t + (1 - d.count / maxV) * ph,
    label: d.name, count: d.count,
  }));

  // Smooth cubic bezier
  const smooth = pts.map((p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");

  const area = `${smooth} L${pts.at(-1).x},${P.t + ph} L${pts[0].x},${P.t + ph}Z`;

  const ticks = [0, 0.5, 1].map(t => ({
    y: P.t + (1 - t) * ph, v: Math.round(t * maxV),
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
      <path d={smooth} fill="none" stroke="#046137" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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

function HBarChart({ data, formatLabel, maxItems, colorFn }) {
  if (!data || data.length === 0)
    return <p className="text-[12px] text-gray-300 text-center py-8">Belum ada data.</p>;
  const items = maxItems ? data.slice(0, maxItems) : data;
  const max   = Math.max(...items.map(d => d.count), 1);
  const sum   = items.reduce((s, d) => s + d.count, 0);
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const barPct = Math.max((item.count / max) * 100, 2);
        const relPct = sum > 0 ? Math.round((item.count / sum) * 100) : 0;
        const color  = colorFn ? colorFn(item.name) : PALETTE[i % PALETTE.length];
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
            <div className="h-[7px] bg-gray-50 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.85 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Vertical Bar ─────────────────────────────────────────────────────────────

function VBarChart({ data, maxItems = 8, labelTrunc = 16, colorFn }) {
  if (!data || data.length === 0)
    return <p className="text-[12px] text-gray-300 text-center py-8">Belum ada data.</p>;

  const items = data.slice(0, maxItems);
  const max   = Math.max(...items.map(d => d.count), 1);
  const n     = items.length;

  const W = 460, H = 160;
  const P = { l: 28, r: 12, t: 28, b: 36 };
  const pw = W - P.l - P.r, ph = H - P.t - P.b;
  const colW = pw / n;
  const barW = Math.min(52, colW * 0.55);

  const ticks = [0, 0.5, 1].map(t => ({
    y: P.t + (1 - t) * ph, v: Math.round(t * max),
  }));

  const fmt = (s) => labelTrunc > 0 && s.length > labelTrunc
    ? s.slice(0, labelTrunc) + "…" : s;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      {ticks.map(t => (
        <g key={t.y}>
          <line x1={P.l} y1={t.y} x2={W - P.r} y2={t.y} stroke="#f1f5f9" strokeWidth="1" />
          <text x={P.l - 5} y={t.y + 4} textAnchor="end" fontSize="9"
            fill="#cbd5e1" fontFamily="system-ui">{t.v}</text>
        </g>
      ))}
      {items.map((item, i) => {
        const cx    = P.l + colW * i + colW / 2;
        const barH  = item.count > 0 ? Math.max((item.count / max) * ph, 3) : 0;
        const barY  = P.t + ph - barH;
        const color = colorFn ? colorFn(item.name, i) : PALETTE[i % PALETTE.length];
        return (
          <g key={item.name}>
            <rect x={cx - barW / 2} y={barY} width={barW} height={barH}
              rx="5" ry="5" fill={color} opacity="0.85" />
            {item.count > 0 && (
              <text x={cx} y={barY - 6} textAnchor="middle" fontSize="10.5"
                fill={color} fontWeight="800" fontFamily="system-ui">{item.count}</text>
            )}
            <text x={cx} y={H - 1} textAnchor="middle" fontSize="9.5"
              fill="#94a3b8" fontFamily="system-ui">{fmt(item.name)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function HeatmapChart({ data }) {
  if (!data || !data.rows || data.rows.length === 0)
    return <p className="text-[12px] text-gray-300 text-center py-6">Belum ada data.</p>;
  const { rows, cols, cells, max } = data;
  return (
    <div>
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
                    {FAK_ABBR[fak] ?? fak}
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
                          title={`${FAK_ABBR[fak] ?? fak} · ${c}: ${count}`}
                        >
                          {count === 0 ? <span className="text-gray-200 font-normal text-[11px]">—</span> : count}
                        </div>
                      </td>
                    );
                  })}
                  <td className="pl-4 py-1 text-center font-black text-gray-700 text-[13px] align-middle tabular-nums">{rowTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Skala warna */}
      <div className="mt-4 flex items-center gap-2.5 justify-end">
        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Skala:</span>
        <span className="text-[10px] text-gray-400">Sedikit</span>
        <div className="flex gap-0.5">
          {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0].map(t => (
            <div key={t} className="w-5 h-2.5 rounded-sm"
              style={{ backgroundColor: `rgba(4,97,55,${(0.08 + 0.82 * t).toFixed(2)})` }} />
          ))}
        </div>
        <span className="text-[10px] text-gray-400">Banyak</span>
      </div>
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
          ${value ? "font-bold border-[#046137] bg-[#f0f7f3] text-[#046137]" : "font-normal"}`}
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
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#d4ebe0] text-[#046137] rounded-full text-[11px] font-bold leading-none"
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
    if (f.fakultas)  p.set("fakultas",  f.fakultas);
    if (f.prodi)     p.set("prodi",     f.prodi);
    if (f.tahun)     p.set("tahun",     f.tahun);
    if (f.tingkatan) p.set("tingkatan", f.tingkatan);
    if (f.kategori)  p.set("kategori",  f.kategori);
    if (f.periode)   p.set("periode",   f.periode);
    return p.toString();
  }, []);

  const fetchStats = useCallback((f) => {
    setLoading(true);
    const qs = buildParams(f);
    apiFetch(`${API_URL}/stats/visualisasi${qs ? "?" + qs : ""}`)
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

  // ── Export Excel ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const qs  = buildParams(filters);
      const res = await apiFetch(`${API_URL}/stats/export${qs ? "?" + qs : ""}`);
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
      const res = await apiFetch(`${API_URL}/stats/export${qs ? "?" + qs : ""}`);
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

      const total = stats?.total ?? data.length;
      const boxes = [
        { label: "Total Disetujui", value: total,                                                                                              color: [4,97,55]    },
        { label: "Puspresnas",      value: (stats?.by_jenis ?? []).find(d => d.name === "Lomba Mandiri Puspresnas")?.count ?? 0,     color: [4,97,55]    },
        { label: "Non-Puspresnas",  value: (stats?.by_jenis ?? []).find(d => d.name === "Lomba Mandiri Non-Puspresnas")?.count ?? 0, color: [13,148,136] },
        { label: "Rekognisi",       value: (stats?.by_jenis ?? []).find(d => d.name === "Rekognisi Non-Lomba")?.count ?? 0,          color: [180,83,9]   },
      ];
      const BY = 25, BH = 14, BW = (PW - M * 2 - 3 * 3) / 4;
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
        didDrawPage: ({ pageNumber }) => { if (pageNumber > 1) drawHeader(); },
      });

      // ── Helpers Visualisasi ──────────────────────────────────────────────────
      const FAK_ABBR_P = {
        "Fakultas Teknologi Informasi":        "FTI",
        "Fakultas Bisnis":                     "Bisnis",
        "Fakultas Bioteknologi":               "Bioteknologi",
        "Fakultas Kedokteran":                 "Kedokteran",
        "Fakultas Arsitektur dan Desain":      "Arsitektur & Desain",
        "Fakultas Humaniora":                  "Humaniora",
        "Fakultas Kependidikan dan Humaniora": "Kependidikan & Humaniora",
        "Fakultas Teologi":                    "Teologi",
      };
      const FAK_COLOR_P = {
        "Fakultas Teknologi Informasi":        [107,114,128],
        "Fakultas Bisnis":                     [253,209,0],
        "Fakultas Bioteknologi":               [4,97,55],
        "Fakultas Kedokteran":                 [226,232,240],
        "Fakultas Arsitektur dan Desain":      [37,99,235],
        "Fakultas Humaniora":                  [249,115,22],
        "Fakultas Kependidikan dan Humaniora": [249,115,22],
        "Fakultas Teologi":                    [147,51,234],
      };
      const PRODI_COLOR_P = {
        "Prodi Filsafat Keilahian":        [147,51,234],
        "Prodi Manajemen":                 [253,209,0],
        "Prodi Akuntansi":                 [212,168,0],
        "Prodi Biologi":                   [4,97,55],
        "Prodi Kedokteran":                [203,213,225],
        "Prodi Arsitektur":                [37,99,235],
        "Prodi Desain Produk":             [96,165,250],
        "Prodi Informatika":               [75,85,99],
        "Prodi Sistem Informasi":          [156,163,175],
        "Prodi Pendidikan Bahasa Inggris": [234,88,12],
        "Prodi Studi Humanitas":           [251,146,60],
      };
      const JENIS_COLOR_P = {
        "Lomba Mandiri Puspresnas":     [4,97,55],
        "Lomba Mandiri Non-Puspresnas": [13,148,136],
        "Rekognisi Non-Lomba":          [180,83,9],
      };
      const JENIS_LABEL_P = {
        "Lomba Mandiri Puspresnas":     "Puspresnas",
        "Lomba Mandiri Non-Puspresnas": "Non-Puspresnas",
        "Rekognisi Non-Lomba":          "Rekognisi",
      };

      // Untuk warna terang (kuning dll), turunkan ke shade gelap agar teks terbaca
      const safeTextColor = ([r, g, b]) => {
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return lum > 0.65 ? [Math.round(r * 0.45), Math.round(g * 0.45), Math.round(b * 0.45)] : [r, g, b];
      };

      const secT = (x, y, txt, lw = 65) => {
        doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...GREEN);
        doc.text(txt.toUpperCase(), x, y);
        doc.setDrawColor(...GREEN); doc.setLineWidth(0.3);
        doc.line(x, y + 1.5, x + lw, y + 1.5);
      };

      // Vertical bar chart
      const pdfVBars = (items, ox, oy, cw, ch, colorFn) => {
        if (!items || items.length === 0) return;
        const maxV = Math.max(...items.map(d => d.count), 1);
        const colW = cw / items.length;
        const barW = Math.min(16, colW * 0.62);
        [0, 0.5, 1].forEach(t => {
          const gy = oy + (1 - t) * ch;
          doc.setDrawColor(230,234,240); doc.setLineWidth(0.2);
          doc.line(ox, gy, ox + cw, gy);
          doc.setFont("helvetica","normal"); doc.setFontSize(5.5); doc.setTextColor(180,190,205);
          doc.text(String(Math.round(t * maxV)), ox - 2, gy + 2, { align:"right" });
        });
        items.forEach((d, i) => {
          const cx_b = ox + colW * i + colW / 2;
          const bh = d.count > 0 ? Math.max((d.count / maxV) * ch, 2) : 0;
          const by = oy + ch - bh;
          const c = colorFn ? colorFn(d.name, i) : GREEN;
          const tc = safeTextColor(c);
          doc.setFillColor(...c);
          doc.roundedRect(cx_b - barW/2, by, barW, bh, 1.5, 1.5, "F");
          if (d.count > 0) {
            doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(...tc);
            doc.text(String(d.count), cx_b, by - 1.5, { align:"center" });
          }
          const lbl = String(d.name).length > 9 ? String(d.name).slice(0,8)+"…" : String(d.name);
          doc.setFont("helvetica","normal"); doc.setFontSize(5.5); doc.setTextColor(148,163,184);
          doc.text(lbl, cx_b, oy + ch + 5, { align:"center" });
        });
      };

      // Horizontal bar chart
      const pdfHBars = (items, ox, oy, labelW, barW, rowH, colorFn) => {
        if (!items || items.length === 0) return;
        const tot = items.reduce((s, d) => s + d.count, 0);
        const maxV = Math.max(...items.map(d => d.count), 1);
        items.forEach((d, i) => {
          const ry = oy + i * rowH;
          const bw = d.count > 0 ? Math.max((d.count / maxV) * barW, 1.5) : 0;
          const c  = colorFn ? colorFn(d.name, i) : GREEN;
          const tc = safeTextColor(c);
          const lbl = String(d.name).length > 22 ? String(d.name).slice(0,21)+"…" : String(d.name);
          const pct = tot > 0 ? Math.round(d.count / tot * 100) : 0;
          doc.setFont("helvetica","normal"); doc.setFontSize(6); doc.setTextColor(100,116,139);
          doc.text(lbl, ox, ry + 3.5);
          doc.setFillColor(240,244,248); doc.rect(ox + labelW, ry, barW, 5, "F");
          if (bw > 0) { doc.setFillColor(...c); doc.rect(ox + labelW, ry, bw, 5, "F"); }
          doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(...tc);
          doc.text(`${d.count} (${pct}%)`, ox + labelW + barW + 2, ry + 3.5);
        });
      };

      // Donut chart (triangle approximation)
      const pdfDonut = (data, cx, cy, outerR, innerR, totalVal) => {
        if (!data || data.length === 0) return;
        const items = data.filter(d => d.count > 0);
        let startA = -Math.PI / 2;
        items.forEach(d => {
          const angle = (d.count / totalVal) * 2 * Math.PI;
          const endA  = startA + angle;
          const steps = Math.max(8, Math.ceil(angle * 22));
          const c = JENIS_COLOR_P[d.name] ?? GREEN;
          doc.setFillColor(...c);
          for (let j = 0; j < steps; j++) {
            const a1 = startA + angle * j / steps;
            const a2 = startA + angle * (j + 1) / steps;
            doc.triangle(cx, cy,
              cx + outerR * Math.cos(a1), cy + outerR * Math.sin(a1),
              cx + outerR * Math.cos(a2), cy + outerR * Math.sin(a2), "F");
          }
          startA = endA;
        });
        doc.setFillColor(255,255,255);
        doc.circle(cx, cy, innerR, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(17,24,39);
        doc.text(String(totalVal), cx, cy + 1.5, { align:"center" });
        doc.setFont("helvetica","normal"); doc.setFontSize(6); doc.setTextColor(156,163,175);
        doc.text("Klaim", cx, cy + 6, { align:"center" });
        // Legend di kanan donut
        const LX = cx + outerR + 5;
        items.forEach((d, i) => {
          const ly = cy - outerR + i * 12;
          const c = JENIS_COLOR_P[d.name] ?? GREEN;
          const lbl = JENIS_LABEL_P[d.name] ?? d.name;
          const pct = totalVal > 0 ? Math.round(d.count / totalVal * 100) : 0;
          doc.setFillColor(...c); doc.circle(LX + 1.5, ly + 2, 1.5, "F");
          doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(100,116,139);
          doc.text(lbl, LX + 5, ly + 3.5);
          doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(31,41,55);
          doc.text(String(d.count), LX + 5, ly + 9);
          doc.setFont("helvetica","normal"); doc.setFontSize(6); doc.setTextColor(156,163,175);
          doc.text(`${pct}%`, LX + 16, ly + 9);
        });
      };

      // Heatmap
      const pdfHeatmap = (heatmap, ox, oy, availW) => {
        if (!heatmap || !heatmap.rows || heatmap.rows.length === 0) return;
        const { rows, cols, cells, max: hMax } = heatmap;
        const labelColW = 36;
        const cellW = Math.min(16, (availW - labelColW - 14) / cols.length);
        const cellH = 8;
        doc.setFont("helvetica","bold"); doc.setFontSize(6.5); doc.setTextColor(100,116,139);
        doc.text("Fakultas", ox, oy + 4);
        cols.forEach((c, ci) => {
          doc.text(String(c), ox + labelColW + ci * cellW + cellW/2, oy + 4, { align:"center" });
        });
        doc.text("Total", ox + labelColW + cols.length * cellW + 7, oy + 4, { align:"center" });
        rows.forEach((fak, ri) => {
          const ry = oy + 7 + ri * cellH;
          const rowTotal = cols.reduce((s, c) => s + (cells[fak]?.[c] ?? 0), 0);
          const lbl = FAK_ABBR_P[fak] ?? fak;
          doc.setFont("helvetica","normal"); doc.setFontSize(6); doc.setTextColor(100,116,139);
          doc.text(lbl, ox, ry + 4.5);
          cols.forEach((c, ci) => {
            const count = cells[fak]?.[c] ?? 0;
            const t = hMax > 0 ? count / hMax : 0;
            const alpha = count === 0 ? 0 : (0.08 + 0.82 * t);
            const rr = Math.round(4   + (240 - 4)   * (1 - alpha));
            const gg = Math.round(97  + (248 - 97)  * (1 - alpha));
            const bb = Math.round(55  + (247 - 55)  * (1 - alpha));
            doc.setFillColor(rr, gg, bb);
            doc.roundedRect(ox + labelColW + ci * cellW + 0.5, ry, cellW - 1, cellH - 1, 1, 1, "F");
            if (count > 0) {
              const fg = t > 0.48 ? [255,255,255] : GREEN;
              doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(...fg);
              doc.text(String(count), ox + labelColW + ci * cellW + cellW/2, ry + 4.5, { align:"center" });
            }
          });
          doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(31,41,55);
          doc.text(String(rowTotal), ox + labelColW + cols.length * cellW + 7, ry + 4.5, { align:"center" });
        });
        // Skala warna
        const sy = oy + 7 + rows.length * cellH + 4;
        doc.setFont("helvetica","normal"); doc.setFontSize(6); doc.setTextColor(156,163,175);
        doc.text("Skala:", ox, sy + 3);
        doc.text("Sedikit", ox + 10, sy + 3);
        [0.1,0.25,0.4,0.55,0.7,0.85,1.0].forEach((t, si) => {
          const alpha = 0.08 + 0.82 * t;
          doc.setFillColor(
            Math.round(4   + (240-4)   * (1-alpha)),
            Math.round(97  + (248-97)  * (1-alpha)),
            Math.round(55  + (247-55)  * (1-alpha))
          );
          doc.rect(ox + 25 + si * 5.5, sy, 5, 3.5, "F");
        });
        doc.text("Banyak", ox + 25 + 7 * 5.5 + 1, sy + 3);
      };

      // ── Viz Page 1: Tren + Jenis | Periode + Tingkatan ───────────────────────
      const LX = M, LW = 130, RX = M + 139, RW = PW - M - 139 - M;
      const VP1Y0 = 28;

      doc.addPage();
      drawHeader();

      // Baris 1: Tren per Tahun (kiri) | Jenis Kegiatan donut (kanan)
      const B1H = 50;
      secT(LX, VP1Y0, "Tren Klaim per Tahun", LW);
      pdfVBars(stats?.by_tahun ?? [], LX + 8, VP1Y0 + 8, LW - 10, B1H,
        () => GREEN);

      secT(RX, VP1Y0, "Jenis Kegiatan", RW);
      const donutCX = RX + 22, donutCY = VP1Y0 + 8 + B1H/2;
      pdfDonut(stats?.by_jenis ?? [], donutCX, donutCY, 20, 13, stats?.total ?? 0);

      // Baris 2: Klaim per Periode (kiri) | Tingkatan Lomba (kanan)
      const B2Y = VP1Y0 + B1H + 16;
      const B2H = 48;
      secT(LX, B2Y, "Klaim per Periode", LW);
      const GS = [[4,97,55],[10,122,74],[16,160,99],[45,184,122],[91,204,150],[141,219,180]];
      pdfVBars((stats?.by_periode ?? []).slice(-5), LX + 8, B2Y + 8, LW - 10, B2H,
        (_, i) => GS[i % GS.length]);

      secT(RX, B2Y, "Tingkatan Lomba", RW);
      pdfVBars(stats?.by_tingkatan ?? [], RX + 8, B2Y + 8, RW - 10, B2H,
        (_, i) => GS[i % GS.length]);

      // ── Viz Page 2: Fakultas + Prodi ─────────────────────────────────────────
      doc.addPage();
      drawHeader();

      const VP2Y0 = 28;
      const byFak_pdf   = stats?.by_fakultas ?? [];
      const byProdi_pdf = stats?.by_prodi    ?? [];

      secT(LX, VP2Y0, "Distribusi per Fakultas", LW);
      pdfHBars(byFak_pdf, LX, VP2Y0 + 8, 32, LW - 32 - 26, 9,
        (name) => FAK_COLOR_P[name] ?? GREEN);

      secT(RX, VP2Y0, "Program Studi", RW);
      pdfHBars(byProdi_pdf, RX, VP2Y0 + 8, 36, RW - 36 - 26, 9,
        (name) => PRODI_COLOR_P[name] ?? GREEN);

      // ── Viz Page 3: Heatmap (halaman penuh agar tidak terpotong) ──────────────
      doc.addPage();
      drawHeader();

      secT(LX, 28, "Sebaran Klaim per Fakultas × Tahun", PW - M * 2);
      pdfHeatmap(stats?.heatmap, LX, 36, PW - M * 2);

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

  const findJenis = (name) => (stats?.by_jenis ?? []).find(d => d.name === name)?.count ?? 0;

  const kpiItems = [
    { label: "Total Disetujui", value: stats?.total ?? 0,                        bg: "bg-[#f0f7f3]",  border: "border-[#d4ebe0]",  text: "text-[#046137]",  numText: "text-gray-900"   },
    { label: "Puspresnas",      value: findJenis("Lomba Mandiri Puspresnas"),     bg: "bg-[#e8f4ef]",  border: "border-[#046137]",  text: "text-[#046137]",  numText: "text-[#023d22]"  },
    { label: "Non-Puspresnas",  value: findJenis("Lomba Mandiri Non-Puspresnas"), bg: "bg-[#e6f7f6]",  border: "border-[#0d9488]",  text: "text-[#0d9488]",  numText: "text-[#0a6b63]"  },
    { label: "Rekognisi",       value: findJenis("Rekognisi Non-Lomba"),          bg: "bg-[#fef3e2]",  border: "border-[#b45309]",  text: "text-[#b45309]",  numText: "text-[#7c3a06]"  },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Visualisasi Data</h1>
          <p className="text-gray-400 mt-3 text-[14px]">
            Statistik klaim sertifikat terverifikasi — filter lalu export ke Excel atau PDF.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0 mt-1">
          <button onClick={handleExport} disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {exporting ? <Spinner className="w-4 h-4 text-green-600" />
              : <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>}
            {exporting ? "Mengekspor..." : "Excel"}
          </button>
          <button onClick={handleExportPDF} disabled={exportingPdf || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {exportingPdf ? <Spinner className="w-4 h-4 text-green-600" />
              : <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#d4ebe0] text-[#046137] tabular-nums">
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
          <FilterSelect label="Tahun"          value={filters.tahun}     onChange={v => setFilter("tahun", v)}      options={filterOpts?.tahun ?? []} />
          <FilterSelect label="Fakultas"       value={filters.fakultas}  onChange={v => setFilter("fakultas", v)}   options={(filterOpts?.fakultas ?? []).map(f => ({ value: f, label: FAK_SHORT[f] ?? f }))} />
          <FilterSelect label="Prodi"          value={filters.prodi}     onChange={v => setFilter("prodi", v)}      options={prodiOptions} disabled={prodiOptions.length === 0} />
          <FilterSelect label="Tingkatan"      value={filters.tingkatan} onChange={v => setFilter("tingkatan", v)}  options={filterOpts?.tingkatan ?? []} />
          <FilterSelect label="Jenis Kegiatan" value={filters.kategori}  onChange={v => setFilter("kategori", v)}   options={[
            { value: "lomba_mandiri_puspresnas",     label: "Lomba Mandiri Puspresnas"     },
            { value: "lomba_mandiri_non_puspresnas", label: "Lomba Mandiri Non-Puspresnas" },
            { value: "rekognisi",                    label: "Rekognisi Non-Lomba"          },
          ]} />
          <FilterSelect label="Periode"        value={filters.periode}   onChange={v => setFilter("periode", v)}    options={filterOpts?.periode ?? []} />
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

          {/* Row 1 — KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {kpiItems.map(k => (
              <KPICard key={k.label} {...k} total={stats.total} />
            ))}
          </div>

          {/* Row 2 — Tren per Tahun + Jenis Kegiatan */}
          <div className="grid grid-cols-12 gap-5">
            <ChartCard label="Tren" title="Klaim Disetujui per Tahun" className="col-span-7">
              <TrendChart data={stats.by_tahun} />
            </ChartCard>
            <ChartCard label="Komposisi" title="Jenis Kegiatan" className="col-span-5">
              <DonutChart
                data={stats.by_jenis}
                total={stats.total}
                centerLabel="Klaim"
                colorFn={n => JENIS_COLOR[n] ?? PALETTE[0]}
                labelFn={n => JENIS_SHORT[n] ?? n}
              />
            </ChartCard>
          </div>

          {/* Row 3 — Per Periode + Tingkatan Lomba */}
          <div className="grid grid-cols-2 gap-5">
            <ChartCard label="Distribusi" title="Klaim per Periode">
              <VBarChart data={(stats.by_periode ?? []).slice(-5)} labelTrunc={14}
                colorFn={(_, i) => GREEN_SHADES[i % GREEN_SHADES.length]} />
            </ChartCard>
            <ChartCard label="Distribusi" title="Tingkatan Lomba">
              <VBarChart data={stats.by_tingkatan} maxItems={6}
                colorFn={(_, i) => GREEN_SHADES[i % GREEN_SHADES.length]} />
            </ChartCard>
          </div>

          {/* Row 4 — Per Fakultas + Program Studi */}
          <div className="grid grid-cols-2 gap-5">
            <ChartCard label="Distribusi" title="Per Fakultas">
              <HBarChart data={stats.by_fakultas} formatLabel={n => FAK_SHORT[n] ?? n} maxItems={7}
                colorFn={n => FAK_COLOR[n] ?? PALETTE[0]} />
            </ChartCard>
            <ChartCard label="Distribusi" title="Program Studi">
              <HBarChart data={stats.by_prodi}
                colorFn={n => PRODI_COLOR[n] ?? FAK_COLOR[PRODI_FAK[n]] ?? PALETTE[0]} />
            </ChartCard>
          </div>

          {/* Row 5 — Heatmap */}
          <ChartCard label="Sebaran" title="Klaim per Fakultas × Tahun">
            <HeatmapChart data={stats.heatmap} />
          </ChartCard>

        </div>
      )}
    </div>
  );
}
