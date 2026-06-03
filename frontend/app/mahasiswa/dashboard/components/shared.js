// Konstanta, utilitas, dan komponen UI bersama yang digunakan di seluruh halaman mahasiswa.
"use client";

// ─── KONSTANTA ───────────────────────────────────────────────────────────────

// Nama bulan Indonesia untuk format tampilan tanggal.
export const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

// URL base backend — fallback ke localhost jika env tidak di-set.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Label tampilan per kategori klaim.
export const KATEGORI_LABEL = { puspresnas: "PUSPRESNAS", non_puspresnas: "Non PUSPRESNAS", publikasi: "Publikasi / Karya / HKI" };

// ─── FETCH HELPER ─────────────────────────────────────────────────────────────

// Wrapper fetch yang menyisipkan header ngrok agar tidak diblokir ngrok browser warning.
export function apiFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { "ngrok-skip-browser-warning": "true", ...(options.headers || {}) },
  });
}

// ─── STATUS & LABEL ───────────────────────────────────────────────────────────

// Mengembalikan label teks status klaim yang ramah pengguna.
export const STATUS_LABEL = (status) => {
  if (status === "sudah dicek") return "Selesai";
  if (status === "ditolak")     return "Ditolak";
  return "Dalam Proses";
};

// Mengembalikan kelas Tailwind warna badge berdasarkan status klaim.
export const STATUS_STYLE = (status) => {
  if (status === "sudah dicek") return "bg-green-100 text-green-700";
  if (status === "ditolak")     return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
};

// Label tampilan untuk setiap status reward konfirmasi.
export const REWARD_LABEL = {
  menunggu:     "Dalam Proses",
  diproses:     "Data Disetujui",
  selesai:      "Reward Dikirim",
  dikembalikan: "Perlu Diperbaiki",
  ditolak:      "Ditolak",
};

// Kelas Tailwind warna badge untuk setiap status reward.
export const REWARD_STYLE = {
  menunggu:     "bg-blue-100 text-blue-700",
  diproses:     "bg-blue-100 text-blue-700",
  selesai:      "bg-green-100 text-green-700",
  dikembalikan: "bg-orange-100 text-orange-700",
  ditolak:      "bg-red-100 text-red-700",
};

// ─── FORMAT TANGGAL ───────────────────────────────────────────────────────────

// Mengubah string tanggal "YYYY-MM-DD" menjadi format "D Bulan YYYY".
export function formatTanggal(str) {
  if (!str) return "—";
  const [y, m, d] = str.slice(0, 10).split("-");
  return `${parseInt(d)} ${BULAN[parseInt(m) - 1]} ${y}`;
}

// Mengubah string datetime "YYYY-MM-DD HH:MM:SS" menjadi format "D Bulan YYYY, HH:MM".
export function formatDatetime(str) {
  if (!str) return "—";
  const [date, time] = str.split(" ");
  const [y, m, d] = date.split("-");
  const jam = time ? time.slice(0, 5) : "";
  return `${parseInt(d)} ${BULAN[parseInt(m) - 1]} ${y}${jam ? `, ${jam}` : ""}`;
}

// ─── KOMPONEN UI ──────────────────────────────────────────────────────────────

// Menampilkan satu baris label-nilai; tidak merender apa pun jika value kosong.
export function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 mt-0.5 text-sm">{value}</p>
    </div>
  );
}

// Menampilkan bar chart horizontal dari array { name, count }; lebar tiap bar proporsional terhadap nilai tertinggi.
export function BarChart({ data, colorClass = "bg-[#046137]", formatLabel }) {
  if (!data || data.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-8">Belum ada data.</p>
  );
  // Cegah pembagian nol dengan minimum 1.
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.name} className="flex items-center gap-3">
          <p className="text-[12px] text-gray-600 w-44 flex-shrink-0 truncate" title={item.name}>
            {formatLabel ? formatLabel(item.name) : item.name}
          </p>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                // Minimum lebar 4% agar bar tetap terlihat walau nilainya sangat kecil.
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
