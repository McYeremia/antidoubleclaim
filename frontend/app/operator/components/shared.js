// Konstanta, utilitas, dan komponen UI bersama yang digunakan di seluruh halaman operator.
"use client";

import { useState, useEffect } from "react";

// ─── KONSTANTA ────────────────────────────────────────────────────────────────

// URL base backend — fallback ke localhost jika env tidak di-set.
export const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ─── FETCH HELPER ─────────────────────────────────────────────────────────────

// Wrapper fetch yang menyisipkan header ngrok agar tidak diblokir ngrok browser warning.
export function apiFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { "ngrok-skip-browser-warning": "true", ...(options.headers || {}) },
  });
}

// ─── FORMAT TANGGAL ───────────────────────────────────────────────────────────

const BULAN = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

// Mengubah string "YYYY-MM-DD" menjadi format "D Bulan YYYY".
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

// ─── STATUS & LABEL ───────────────────────────────────────────────────────────

// Kelas Tailwind warna badge berdasarkan status klaim.
export const STATUS_BADGE = {
  "perlu ditinjau": "bg-orange-100 text-orange-700",
  "belum dicek":    "bg-blue-100 text-blue-700",
  "sudah dicek":    "bg-green-100 text-green-700",
  "ditolak":        "bg-red-100 text-red-700",
};

// Label teks yang ditampilkan di tabel untuk setiap status klaim.
export const STATUS_LABEL = {
  "belum dicek":    "Antrean Verifikasi",
  "perlu ditinjau": "Terindikasi Duplikat",
  "sudah dicek":    "Disetujui",
  "ditolak":        "Ditolak",
};

// Label tampilan per kategori klaim SIMKATMAWA.
export const KATEGORI_LABEL = {
  puspresnas:     "PUSPRESNAS",
  non_puspresnas: "Non PUSPRESNAS",
  publikasi:      "Publikasi / Karya / HKI",
};

// Kelas Tailwind badge untuk setiap status reward konfirmasi.
export const REWARD_STATUS_BADGE = {
  menunggu:     "bg-[#d4ebe0] text-[#046137]",
  diproses:     "bg-[#d4ebe0] text-[#046137]",
  selesai:      "bg-green-100 text-green-700",
  ditolak:      "bg-red-100 text-red-700",
  dikembalikan: "bg-orange-100 text-orange-700",
};

// Label teks untuk setiap status reward konfirmasi.
export const REWARD_STATUS_LABEL = {
  menunggu:     "Menunggu",
  diproses:     "Diproses",
  selesai:      "Selesai",
  dikembalikan: "Dikembalikan",
  ditolak:      "Ditolak",
};

// Warna badge dan label teks untuk setiap status periode klaim.
export const ARSIP_STATUS_STYLE = {
  aktif:      { badge: "bg-green-100 text-green-700",   label: "Aktif" },
  tutup:      { badge: "bg-gray-100 text-gray-500",     label: "Tutup" },
  ditutup:    { badge: "bg-orange-100 text-orange-600", label: "Ditutup" },
  diarsipkan: { badge: "bg-purple-100 text-purple-700", label: "Diarsipkan" },
};

// Label kategori klaim lengkap untuk tampilan arsip.
export const ARSIP_LABEL_KATEGORI = {
  lomba_mandiri_puspresnas:     "Lomba Mandiri — Puspresnas (DIKTI)",
  lomba_mandiri_non_puspresnas: "Lomba Mandiri — Non Puspresnas (Non DIKTI)",
  rekognisi:                    "Rekognisi Non-Lomba",
};

// Mengembalikan true jika kategori termasuk lomba mandiri (bukan rekognisi).
export const arsipIsLomba = (kat) =>
  kat === "lomba_mandiri_puspresnas" || kat === "lomba_mandiri_non_puspresnas";

// ─── KOMPONEN UI ──────────────────────────────────────────────────────────────

// Menampilkan satu baris label-nilai; tidak merender jika value kosong.
export function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-gray-900 mt-1 text-[13px] font-medium">{value}</p>
    </div>
  );
}

// Tautan file dokumen dengan nama asli (strip UUID prefix); di-proxy via Next.js /api/file dengan op-id.
export function DocLink({ label, path }) {
  if (!path) return null;
  const filename = path.split(/[\\/]/).pop(); // ambil nama file saja dari full path (pisah "/" atau "\")

  // Nama file di server: "{prefix}_{uuid32hex}_{nama_asli}" — regex ini mengekstrak nama_asli saja
  // Contoh: "sertifikat_a1b2c3d4...e5f6_lomba.pdf" → "lomba.pdf"
  const match       = filename.match(/^.+?_[0-9a-f]{32}_(.+)$/);
  const displayName = match ? match[1] : filename;

  // typeof window !== "undefined" diperlukan agar tidak error saat rendering di server (SSR)
  const opId = typeof window !== "undefined" ? localStorage.getItem("operator_id") : "";
  const href = `/api/file?name=${filename}${opId ? `&op=${opId}` : ""}`;
  return (
    <div className="min-w-0 overflow-hidden">
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[13px] font-bold text-[#046137] hover:text-[#035230] mt-1 flex items-center gap-1.5 overflow-hidden transition-colors"
      >
        <span className="truncate underline underline-offset-2">{displayName}</span>
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}

// Baris label-nilai untuk tampilan detail arsip periode.
export function ArsipField({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-gray-900 mt-1 text-[13px] font-medium">{value}</p>
    </div>
  );
}

// Judul section arsip dengan garis bawah tipis dan huruf kapital tracking lebar.
export function ArsipSectionTitle({ children }) {
  return (
    <h3 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4 mt-6 first:mt-0">
      {children}
    </h3>
  );
}

// Tautan file arsip yang di-proxy via /api/file; nama ditampilkan dipotong jika terlalu panjang.
export function ArsipFileLink({ label, path }) {
  if (!path) return null;
  const filename = path.split(/[\\/]/).pop();
  const display  = filename.length > 36 ? filename.slice(0, 33) + "…" : filename; // potong jika > 36 karakter
  const opId = typeof window !== "undefined" ? localStorage.getItem("operator_id") : ""; // SSR-safe localStorage
  const href = `/api/file?name=${filename}${opId ? `&op=${opId}` : ""}`;
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={filename}
        className="text-[13px] font-bold text-gray-900 underline underline-offset-4 hover:text-[#046137] mt-1 inline-block transition-colors break-all max-w-full"
      >
        {display} ↗
      </a>
    </div>
  );
}

// Modal konfirmasi aksi dengan dukungan catatan wajib, input teks tepat, dan varian warna.
export function ConfirmModal({
  isOpen,
  title,
  message,
  variant = "danger",
  requireNote = false,
  notePlaceholder = "Tulis alasan...",
  noteLabel = "Alasan",
  requireExactText = null,
  confirmLabel = "Konfirmasi",
  onConfirm,
  onCancel,
}) {
  const [note,  setNote]  = useState("");
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!isOpen) { setNote(""); setInput(""); }
  }, [isOpen]);

  if (!isOpen) return null;

  const c = {
    danger:  { btn: "bg-red-600 hover:bg-red-700 text-white",    iconBg: "bg-red-50",    icon: "text-red-500"    },
    warning: { btn: "bg-orange-500 hover:bg-orange-600 text-white", iconBg: "bg-orange-50", icon: "text-orange-500" },
    success: { btn: "bg-[#046137] hover:bg-[#035230] text-white", iconBg: "bg-[#f0f7f3]", icon: "text-[#046137]" },
    default: { btn: "bg-gray-900 hover:bg-gray-700 text-white",   iconBg: "bg-gray-100",  icon: "text-gray-500"   },
  }[variant];

  // Tombol konfirmasi aktif hanya jika semua syarat terpenuhi:
  // - requireNote: catatan harus diisi (tidak boleh kosong)
  // - requireExactText: user harus mengetik teks yang persis sama (untuk aksi destruktif seperti reset data)
  const canConfirm =
    (!requireNote || note.trim().length > 0) &&
    (!requireExactText || input === requireExactText);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
        <div className={`w-12 h-12 rounded-2xl ${c.iconBg} flex items-center justify-center mb-5`}>
          <svg className={`w-6 h-6 ${c.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-[16px] font-black text-gray-900 mb-2">{title}</h3>
        {message && <p className="text-[13px] text-gray-500 leading-relaxed mb-5">{message}</p>}

        {requireNote && (
          <div className="mb-5">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
              {noteLabel} <span className="text-red-400">*</span>
            </p>
            <textarea
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={notePlaceholder}
              autoFocus
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none transition-all"
            />
          </div>
        )}

        {requireExactText && (
          <div className="mb-5">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              Ketik <span className="font-mono font-black text-red-600">&ldquo;{requireExactText}&rdquo;</span> untuk melanjutkan{" "}
              <span className="text-red-400">*</span>
            </p>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => { if (canConfirm) onConfirm(requireNote ? note : undefined); }}
            disabled={!canConfirm}
            className={`px-6 py-2.5 rounded-xl text-[12px] font-black disabled:opacity-40 transition-colors ${c.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal notifikasi satu tombol untuk pesan peringatan, bahaya, atau info.
export function AlertModal({ isOpen, title, message, variant = "warning", onClose }) {
  if (!isOpen) return null;

  const c = {
    warning: { btn: "bg-orange-500 hover:bg-orange-600 text-white", iconBg: "bg-orange-50", icon: "text-orange-500" },
    danger:  { btn: "bg-red-600 hover:bg-red-700 text-white",        iconBg: "bg-red-50",    icon: "text-red-500"    },
    info:    { btn: "bg-gray-900 hover:bg-gray-700 text-white",       iconBg: "bg-blue-50",   icon: "text-blue-500"   },
  }[variant];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
        <div className={`w-12 h-12 rounded-2xl ${c.iconBg} flex items-center justify-center mb-5`}>
          <svg className={`w-6 h-6 ${c.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-[16px] font-black text-gray-900 mb-2">{title}</h3>
        {message && <p className="text-[13px] text-gray-500 leading-relaxed mb-6">{message}</p>}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            autoFocus
            className={`px-6 py-2.5 rounded-xl text-[12px] font-black transition-colors ${c.btn}`}
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

// Preview sertifikat: iframe untuk PDF, tag img untuk gambar.
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
