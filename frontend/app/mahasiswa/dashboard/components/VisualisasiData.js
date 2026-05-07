"use client";

import { useState, useEffect, useCallback } from "react";
import { API_URL, apiFetch } from "./shared";

// ── Konstanta ────────────────────────────────────────────────────────────────

const FAK_SHORT = {
  "Fakultas Teknologi Informasi":   "FTI",
  "Fakultas Bisnis":                "F. Bisnis",
  "Fakultas Bioteknologi":          "F. Bioteknologi",
  "Fakultas Kedokteran":            "F. Kedokteran",
  "Fakultas Arsitektur dan Desain": "F. Arsitektur & Desain",
  "Fakultas Humaniora":             "F. Humaniora",
};

const JENIS_SHORT = {
  "Lomba Mandiri Puspresnas":     "Puspresnas",
  "Lomba Mandiri Non-Puspresnas": "Non-Puspresnas",
  "Rekognisi Non-Lomba":          "Rekognisi",
};

// Violet-centric palette sesuai tema halaman mahasiswa
const PALETTE = ["#7c3aed","#0891b2","#059669","#d97706","#dc2626","#db2777","#0d9488","#f59e0b"];

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className = "" }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5">
      <Sk className="h-52" /><Sk className="h-52" />
      <Sk className="h-48" /><Sk className="h-48" />
      <Sk className="h-44" /><Sk className="h-44" />
      <Sk className="col-span-2 h-52" />
    </div>
  );
}

// ── Horizontal Bar Chart ─────────────────────────────────────────────────────
// Terbaik untuk perbandingan ranking antar kategori (Cleveland 1984).
// Horizontal karena label panjang; manusia lebih akurat membaca panjang vs sudut.

function HBarChart({ data, formatLabel, maxItems = 8 }) {
  if (!data || data.length === 0)
    return <p className="text-sm text-gray-400 text-center py-8">Belum ada data.</p>;
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
              <p className="text-[12px] text-gray-600 font-medium truncate max-w-[62%]" title={item.name}>
                {formatLabel ? formatLabel(item.name) : item.name}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-gray-700 tabular-nums">{item.count}</span>
                <span className="text-[10px] text-gray-300 tabular-nums w-7 text-right">{relPct}%</span>
              </div>
            </div>
            <div className="h-[6px] bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barPct}%`, backgroundColor: PALETTE[i % PALETTE.length], opacity: 0.85 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut Chart ──────────────────────────────────────────────────────────────
// Terbaik untuk data "bagian dari keseluruhan" dengan ≤6 kategori (Stephen Few).
// Lubang tengah menampilkan total. Bar tertumpuk menyulitkan perbandingan
// segmen non-pertama karena baseline berbeda (Cleveland 1984).

function DonutChart({ data, total, colorFn, centerLabel = "Total", labelFn }) {
  if (!data || data.length === 0)
    return <p className="text-sm text-gray-400 text-center py-10">Belum ada data.</p>;

  const SIZE = 160, CX = 80, CY = 80, R = 66, r = 46;
  const items = data.filter(d => d.count > 0);
  if (items.length === 0)
    return <p className="text-sm text-gray-400 text-center py-10">Belum ada data.</p>;

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

  return (
    <div className="flex items-center gap-5">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-[130px] h-[130px] flex-shrink-0">
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
          fill="#111827" fontFamily="inherit" dominantBaseline="middle">{total}</text>
        <text x={CX} y={CY + 18} textAnchor="middle" fontSize="8.5" fill="#9ca3af"
          fontFamily="inherit" fontWeight="700">{centerLabel}</text>
      </svg>
      <div className="flex-1 min-w-0 space-y-3">
        {slices.map(s => {
          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
          const label = labelFn ? labelFn(s.name) : s.name;
          return (
            <div key={s.name} className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <p className="text-[12px] text-gray-600 font-medium flex-1 leading-tight truncate min-w-0"
                title={label}>{label}</p>
              <span className="text-[13px] font-bold text-gray-800 tabular-nums flex-shrink-0">{s.count}</span>
              <span className="text-[11px] text-gray-300 w-7 text-right tabular-nums flex-shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Split Bar ────────────────────────────────────────────────────────────────
// Terbaik untuk data biner atau sedikit kategori (Tim / Individu).
// Segmented bar memperlihatkan rasio secara langsung; angka besar menegaskan
// kategori dominan — jauh lebih informatif dari dua mini-bar terpisah.

function SplitBar({ data, total }) {
  if (!data || data.length === 0)
    return <p className="text-sm text-gray-400 text-center py-8">Belum ada data.</p>;
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden gap-px mb-5">
        {data.map((d, i) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          return pct > 0.3 ? (
            <div key={d.name} className="transition-all duration-500"
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
              <p className="text-[12px] text-gray-500 font-semibold mt-1.5">{d.name}</p>
              <p className="text-[11px] text-gray-300 tabular-nums mt-0.5">{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Line Chart (SVG) ─────────────────────────────────────────────────────────
// Terbaik untuk time-series — garis menekankan kontinuitas perubahan (Tufte).

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
  const maxVal = Math.max(...data.map(d => d.count), 1);

  const pts = data.map((d, i) => ({
    x: PAD.l + (i / (data.length - 1)) * plotW,
    y: PAD.t + (1 - d.count / maxVal) * plotH,
    label: d.name, count: d.count,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${pts.at(-1).x},${PAD.t + plotH} L${pts[0].x},${PAD.t + plotH}Z`;
  const yTicks = [0, 0.33, 0.66, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      <defs>
        <linearGradient id="areaGradMhs" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"    />
        </linearGradient>
      </defs>
      {yTicks.map(t => {
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
      <path d={areaPath} fill="url(#areaGradMhs)" />
      <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(p => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="#8b5cf6" />
          <circle cx={p.x} cy={p.y} r="2"   fill="white" />
          <text x={p.x} y={p.y - 9} textAnchor="middle"
            fontSize="10" fill="#7c3aed" fontWeight="700" fontFamily="inherit">{p.count}</text>
          <text x={p.x} y={H - 2} textAnchor="middle"
            fontSize="10" fill="#9ca3af" fontFamily="inherit">{p.label}</text>
        </g>
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
            <th className="text-left pb-3 pr-4 font-semibold text-gray-400 text-[11px] uppercase tracking-wider w-36">
              Fakultas
            </th>
            {cols.map(c => (
              <th key={c} className="pb-3 px-1 text-center font-semibold text-gray-600 text-[12px]">{c}</th>
            ))}
            <th className="pb-3 pl-3 text-center font-semibold text-gray-400 text-[11px] uppercase tracking-wider">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(fak => {
            const rowTotal = cols.reduce((s, c) => s + (cells[fak]?.[c] ?? 0), 0);
            return (
              <tr key={fak}>
                <td className="pr-4 py-1 text-gray-600 text-[11px] whitespace-nowrap align-middle">
                  {FAK_SHORT[fak] ?? fak}
                </td>
                {cols.map(c => {
                  const count     = cells[fak]?.[c] ?? 0;
                  const intensity = max > 0 ? count / max : 0;
                  const bg = count === 0
                    ? "#f9fafb"
                    : `rgba(99,102,241,${(0.12 + 0.82 * intensity).toFixed(2)})`;
                  const fg = intensity > 0.55 ? "white" : (count === 0 ? "#d1d5db" : "#3730a3");
                  return (
                    <td key={c} className="px-1 py-1 align-middle">
                      <div className="rounded-xl flex items-center justify-center h-9 font-bold tabular-nums transition-colors text-[13px]"
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

// ── Card wrapper ─────────────────────────────────────────────────────────────

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
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`text-[13px] border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors
          ${disabled
            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
            : "bg-white text-gray-800 border-gray-200 cursor-pointer hover:border-gray-300"}
          ${value ? "font-semibold border-gray-900 text-gray-900" : "font-normal"}`}
      >
        <option value="">Semua</option>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  );
}

// ── Komponen utama ───────────────────────────────────────────────────────────

const EMPTY_FILTERS = {
  fakultas: "", prodi: "", tahun: "", tingkatan: "", kategori: "", kepesertaan: "",
};

export default function VisualisasiData() {
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [filters,    setFilters]    = useState(EMPTY_FILTERS);
  const [filterOpts, setFilterOpts] = useState(null);

  const buildUrl = useCallback((f) => {
    const p = new URLSearchParams();
    if (f.fakultas)    p.set("fakultas",    f.fakultas);
    if (f.prodi)       p.set("prodi",       f.prodi);
    if (f.tahun)       p.set("tahun",       f.tahun);
    if (f.tingkatan)   p.set("tingkatan",   f.tingkatan);
    if (f.kategori)    p.set("kategori",    f.kategori);
    if (f.kepesertaan) p.set("kepesertaan", f.kepesertaan);
    const qs = p.toString();
    return `${API_URL}/stats/visualisasi${qs ? "?" + qs : ""}`;
  }, []);

  const fetchStats = useCallback((f) => {
    setLoading(true);
    apiFetch(buildUrl(f))
      .then(r => r.ok ? r.json() : Promise.reject("Gagal memuat data"))
      .then(data => {
        setStats(data);
        if (!Object.values(f).some(Boolean)) setFilterOpts(data.filter_options);
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [buildUrl]);

  useEffect(() => { fetchStats(EMPTY_FILTERS); }, [fetchStats]);

  const setFilter = (key, val) => {
    const next = { ...filters, [key]: val };
    if (key === "fakultas") next.prodi = "";
    setFilters(next);
    fetchStats(next);
  };

  const resetFilters = () => { setFilters(EMPTY_FILTERS); fetchStats(EMPTY_FILTERS); };

  const activeCount  = Object.values(filters).filter(Boolean).length;
  const prodiOptions = filters.fakultas
    ? (filterOpts?.prodi_by_fakultas?.[filters.fakultas] ?? [])
    : Object.values(filterOpts?.prodi_by_fakultas ?? {}).flat();

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">
          Statistik Prestasi Mahasiswa
        </h1>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">Filter Data</p>
          {activeCount > 0 && (
            <button onClick={resetFilters}
              className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reset {activeCount} filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
          <FilterSelect label="Tahun"          value={filters.tahun}       onChange={v => setFilter("tahun", v)}       options={filterOpts?.tahun ?? []} />
          <FilterSelect label="Fakultas"       value={filters.fakultas}    onChange={v => setFilter("fakultas", v)}    options={(filterOpts?.fakultas ?? []).map(f => ({ value: f, label: FAK_SHORT[f] ?? f }))} />
          <FilterSelect label="Prodi"          value={filters.prodi}       onChange={v => setFilter("prodi", v)}       options={prodiOptions} disabled={prodiOptions.length === 0} />
          <FilterSelect label="Tingkatan"      value={filters.tingkatan}   onChange={v => setFilter("tingkatan", v)}   options={filterOpts?.tingkatan ?? []} />
          <FilterSelect label="Jenis Kegiatan" value={filters.kategori}    onChange={v => setFilter("kategori", v)}    options={[
            { value: "lomba_mandiri_puspresnas",     label: "Lomba Mandiri Puspresnas"     },
            { value: "lomba_mandiri_non_puspresnas", label: "Lomba Mandiri Non-Puspresnas" },
            { value: "rekognisi",                    label: "Rekognisi Non-Lomba"          },
          ]} />
          <FilterSelect label="Kepesertaan"    value={filters.kepesertaan} onChange={v => setFilter("kepesertaan", v)} options={filterOpts?.kepesertaan ?? []} />
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-red-100">
          <p className="text-sm text-red-500 font-medium">Gagal memuat data statistik.</p>
          <p className="text-xs text-gray-400 mt-1">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">

          {/* Row 1 — Fakultas | Prodi */}
          <ChartCard label="Distribusi" title="Per Fakultas">
            <HBarChart data={stats.by_fakultas} formatLabel={n => FAK_SHORT[n] ?? n} maxItems={7} />
          </ChartCard>
          <ChartCard label="Distribusi" title="Program Studi">
            <HBarChart data={stats.by_prodi} maxItems={8} />
          </ChartCard>

          {/* Row 2 — Tren | Tingkatan */}
          <ChartCard label="Tren" title="Klaim per Tahun">
            <LineChart data={stats.by_tahun} />
          </ChartCard>
          <ChartCard label="Distribusi" title="Tingkatan Lomba">
            <HBarChart data={stats.by_tingkatan} maxItems={6} />
          </ChartCard>

          {/* Row 3 — Donut Jenis | Split Kepesertaan */}
          <ChartCard label="Komposisi" title="Jenis Kegiatan">
            <DonutChart
              data={stats.by_jenis}
              total={stats.total}
              centerLabel="Klaim"
              labelFn={n => JENIS_SHORT[n] ?? n}
            />
          </ChartCard>
          <ChartCard label="Proporsi" title="Jenis Kepesertaan">
            <SplitBar data={stats.by_kepesertaan} total={stats.total} />
          </ChartCard>

          {/* Row 4 — Heatmap full-width */}
          <ChartCard label="Sebaran" title="Klaim per Fakultas × Tahun" fullWidth>
            <HeatmapChart data={stats.heatmap} />
          </ChartCard>

        </div>
      )}
    </div>
  );
}
