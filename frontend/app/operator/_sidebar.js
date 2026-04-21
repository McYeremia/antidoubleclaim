"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const IconClaim = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconReward = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);
const IconUsers = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const IconCalendar = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const IconArchive = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

export function OperatorTopbar() {
  const router = useRouter();
  const [operatorNama, setOperatorNama] = useState("");
  const [operatorRole, setOperatorRole] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [periodeLabel, setPeriodeLabel] = useState(null);

  useEffect(() => {
    setOperatorNama(sessionStorage.getItem("operator_nama") || "Operator");
    setOperatorRole(sessionStorage.getItem("operator_role") || "operator");
    fetch("http://127.0.0.1:8000/periode/aktif")
      .then(r => r.ok ? r.json() : { aktif: false })
      .then(p => setPeriodeLabel(p.aktif && p.periode?.nama ? p.periode.nama : null))
      .catch(() => setPeriodeLabel(null));
  }, []);

  const handleLogout = () => {
    ["role","operator_id","operator_nama","operator_username","operator_role"]
      .forEach(k => sessionStorage.removeItem(k));
    router.push("/");
  };

  const isSuperAdmin = operatorRole === "superadmin";
  const initials = operatorNama.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between px-8 py-3 bg-[#f0f7f3] border-b border-[#d4ebe0]">
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full animate-pulse ${periodeLabel ? "bg-[#046137]" : "bg-gray-300"}`} />
        <h2 className={`text-[11px] font-black uppercase tracking-[0.3em] ${periodeLabel ? "text-[#046137]" : "text-gray-400"}`}>
          {periodeLabel ?? "Tidak Ada Periode Aktif"}
        </h2>
      </div>
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(v => !v)}
          className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-[#d4ebe0] transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-[#046137] flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">{initials || "OP"}</span>
          </div>
          <div className="text-left">
            <p className="text-[13px] font-bold text-gray-900 leading-tight">{operatorNama}</p>
            <p className="text-[10px] font-black text-gray-400 leading-tight uppercase tracking-widest mt-0.5">
              {isSuperAdmin ? "Super Admin" : "Operator"}
            </p>
          </div>
          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-gray-100 shadow-2xl z-20 overflow-hidden">
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Keluar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function OperatorSidebar({ activeKey = "claim" }) {
  const isSuperAdmin = typeof window !== "undefined"
    ? sessionStorage.getItem("operator_role") === "superadmin"
    : false;
  const [superAdmin, setSuperAdmin] = useState(false);
  useEffect(() => {
    setSuperAdmin(sessionStorage.getItem("operator_role") === "superadmin");
  }, []);

  const menus = [
    { key: "claim",     href: "/operator",                  label: "Pengajuan Claim",    icon: <IconClaim />    },
    { key: "reward",    href: "/operator?menu=reward",      label: "Pengajuan Reward",   icon: <IconReward />   },
    ...(superAdmin ? [
      { key: "operators", href: "/operator?menu=operators", label: "Kelola Operator",    icon: <IconUsers />    },
      { key: "periode",   href: "/operator?menu=periode",   label: "Pengaturan Periode", icon: <IconCalendar /> },
      { key: "arsip",     href: "/operator?menu=arsip",     label: "Arsip Periode",      icon: <IconArchive />  },
    ] : []),
  ];

  return (
    <aside className="w-[240px] bg-[#046137] flex flex-col flex-shrink-0 sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-7 pt-9 pb-8">
        <Link href="/operator">
          <p className="text-[22px] font-black text-white leading-none tracking-tight uppercase">
            ANTI<br />DOUBLE<br />CLAIM
          </p>
          <p className="text-[10px] font-semibold text-white/50 mt-2.5 tracking-widest uppercase">Portal Pengelola</p>
        </Link>
      </div>

      {/* Nav */}
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
