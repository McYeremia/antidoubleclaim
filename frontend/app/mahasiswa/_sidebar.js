// Sidebar navigasi portal mahasiswa: menampilkan menu aktif dan menyesuaikan highlight berdasarkan activeKey.
"use client";

import Link from "next/link";

// ─── IKON NAVIGASI ────────────────────────────────────────────────────────────

const IconList = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const IconReward = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);
const IconDoc = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
// const IconChart = () => (
//   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
//   </svg>
// );

// ─── MENU ─────────────────────────────────────────────────────────────────────

// Daftar item navigasi sidebar mahasiswa beserta key, href, dan ikonnya.
const menus = [
  { key: "daftar",      href: "/mahasiswa/dashboard?menu=daftar",    label: "Daftar Klaim",     icon: <IconList />   },
  { key: "reward",      href: "/mahasiswa/dashboard?menu=reward",    label: "Pencairan Reward", icon: <IconReward /> },
  // { key: "visualisasi", href: "/mahasiswa/dashboard?menu=visualisasi", label: "Statistik Prestasi", icon: <IconChart /> },
  { key: "sk-rektor",   href: "/mahasiswa/dashboard?menu=sk-rektor", label: "SK Rektor",        icon: <IconDoc />    },
];

// ─── KOMPONEN UTAMA ───────────────────────────────────────────────────────────

// Sidebar vertikal dengan logo, daftar menu, dan footer institusi; digunakan di semua halaman mahasiswa.
export default function MahasiswaSidebar({ activeKey = "daftar" }) {
  return (
    <aside className="w-[240px] bg-[#046137] flex flex-col flex-shrink-0 h-screen sticky top-0">
      <div className="px-7 pt-9 pb-8">
        <Link href="/mahasiswa/dashboard">
          <img src="/logo_utama.png" alt="Anti Double Claim" className="h-20 w-auto object-contain" />
          <p className="text-[10px] font-semibold text-white/50 mt-2.5 tracking-widest uppercase">Portal Mahasiswa</p>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-0.5">
        {menus.map((m) => (
          <Link
            key={m.key}
            href={m.href}
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-left transition-colors overflow-hidden
              ${m.key === activeKey
                ? "text-white font-bold bg-white/10"
                : "text-white/70 font-medium hover:text-white hover:bg-white/10"
              }`}
          >
            {m.key === activeKey && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-white rounded-full" />
            )}
            {m.icon}
            {m.label}
          </Link>
        ))}
      </nav>

      <div className="px-7 py-6 border-t border-white/10">
        <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest leading-none">UKDW</p>
        <p className="text-[10px] text-white/40 mt-1 leading-snug">Universitas Kristen<br />Duta Wacana</p>
        <p className="text-[10px] text-white/30 mt-3 tabular-nums">© {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}
