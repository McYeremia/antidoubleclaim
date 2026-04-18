"use client";

export const API = "http://127.0.0.1:8000";

const BULAN = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

/** "2026-04-18" → "18 April 2026" */
export function formatTanggal(str) {
  if (!str) return "—";
  const [y, m, d] = str.slice(0, 10).split("-");
  return `${parseInt(d)} ${BULAN[parseInt(m) - 1]} ${y}`;
}

/** "2026-04-18 01:01:31" → "18 April 2026, 01:01" */
export function formatDatetime(str) {
  if (!str) return "—";
  const [date, time] = str.split(" ");
  const [y, m, d] = date.split("-");
  const jam = time ? time.slice(0, 5) : "";
  return `${parseInt(d)} ${BULAN[parseInt(m) - 1]} ${y}${jam ? `, ${jam}` : ""}`;
}

export const STATUS_BADGE = {
  "perlu ditinjau": "bg-orange-100 text-orange-700",
  "belum dicek":    "bg-blue-100 text-blue-700",
  "sudah dicek":    "bg-green-100 text-green-700",
};

export const KATEGORI_LABEL = {
  puspresnas:     "PUSPRESNAS",
  non_puspresnas: "Non PUSPRESNAS",
  publikasi:      "Publikasi / Karya / HKI",
};

export const REWARD_STATUS_BADGE = {
  menunggu:     "bg-blue-100 text-blue-700",
  diproses:     "bg-blue-100 text-blue-700",
  selesai:      "bg-green-100 text-green-700",
  ditolak:      "bg-red-100 text-red-700",
  dikembalikan: "bg-orange-100 text-orange-700",
};

export const ARSIP_STATUS_STYLE = {
  aktif:      { badge: "bg-green-100 text-green-700",   label: "Aktif" },
  tutup:      { badge: "bg-gray-100 text-gray-500",     label: "Tutup" },
  ditutup:    { badge: "bg-orange-100 text-orange-600", label: "Ditutup" },
  diarsipkan: { badge: "bg-purple-100 text-purple-700", label: "Diarsipkan" },
};

export const ARSIP_LABEL_KATEGORI = {
  lomba_mandiri_puspresnas:     "Lomba Mandiri — Puspresnas (DIKTI)",
  lomba_mandiri_non_puspresnas: "Lomba Mandiri — Non Puspresnas (Non DIKTI)",
  rekognisi:                    "Rekognisi Non-Lomba",
};

export const arsipIsLomba = (kat) =>
  kat === "lomba_mandiri_puspresnas" || kat === "lomba_mandiri_non_puspresnas";

export function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-gray-900 mt-1 text-[13px] font-medium">{value}</p>
    </div>
  );
}

export function DocLink({ label, path }) {
  if (!path) return null;
  const filename = path.split(/[\\/]/).pop();
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <a
        href={`${API}/uploads/${filename}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[13px] font-bold text-gray-900 underline underline-offset-2 hover:text-blue-600 mt-1 inline-block"
      >
        {filename} ↗
      </a>
    </div>
  );
}

export function ArsipField({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-gray-900 mt-1 text-[13px] font-medium">{value}</p>
    </div>
  );
}

export function ArsipSectionTitle({ children }) {
  return (
    <h3 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4 mt-6 first:mt-0">
      {children}
    </h3>
  );
}

export function ArsipFileLink({ label, path }) {
  if (!path) return null;
  const filename = path.split(/[\\/]/).pop();
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <a
        href={`${API}/uploads/${filename}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[13px] font-bold text-gray-900 underline underline-offset-4 hover:text-blue-600 mt-1 inline-block transition-colors"
      >
        {filename} ↗
      </a>
    </div>
  );
}

export function ArsipCertPreview({ url, filename }) {
  if (!url || !filename) return null;
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  return (
    <div className="relative group overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-inner">
      {isPdf
        ? <iframe src={url} className="w-full h-80 rounded-2xl" title="Preview" />
        : <img src={url} alt="Preview" className="w-full rounded-2xl object-contain max-h-[400px]" />
      }
    </div>
  );
}
