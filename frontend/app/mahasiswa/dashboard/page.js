"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import TambahKlaimWizard from "./TambahKlaimWizard";
import DaftarKlaim from "./components/DaftarKlaim";
import KonfirmasiReward from "./components/KonfirmasiReward";
import ProfilPanel from "./components/ProfilPanel";
import VisualisasiData from "./components/VisualisasiData";
import SKRektor from "./components/SKRektor";

const IconList = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const IconChart = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

export default function MahasiswaDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeMenu,       setActiveMenu]       = useState("daftar");
  const [showTambah,       setShowTambah]       = useState(false);
  const [search,           setSearch]           = useState("");
  const [claimsRefreshKey, setClaimsRefreshKey] = useState(0);
  const [rewardOpenId,     setRewardOpenId]     = useState(null);
  const [showUserMenu,     setShowUserMenu]     = useState(false);

  // Sinkronisasi menu dengan URL query param
  useEffect(() => {
    const getMenuFromUrl = () =>
      new URLSearchParams(window.location.search).get("menu") || "daftar";

    setActiveMenu(getMenuFromUrl());

    const handlePop = () => setActiveMenu(getMenuFromUrl());
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // Fix: redirect dalam useEffect, bukan langsung di render
  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && !session?.user?.email?.endsWith("@students.ukdw.ac.id"))) {
      router.replace("/");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return <p className="text-center mt-20 text-gray-400">Memuat sesi...</p>;
  }
  if (status === "unauthenticated" || !session?.user?.email?.endsWith("@students.ukdw.ac.id")) {
    return null;
  }

  const navigateTo = (key) => {
    setActiveMenu(key);
    const url = key === "daftar"
      ? window.location.pathname
      : `${window.location.pathname}?menu=${key}`;
    window.history.pushState({ menu: key }, "", url);
  };

  const handleClaimSuccess = () => {
    setClaimsRefreshKey((k) => k + 1);
  };

  const menus = [
    { key: "daftar",      label: "Daftar Klaim",     icon: <IconList />   },
    { key: "reward",      label: "Konfirmasi Reward", icon: <IconReward /> },
    { key: "visualisasi", label: "Visualisasi Data",  icon: <IconChart />  },
    { key: "sk-rektor",   label: "SK Rektor",         icon: <IconDoc />    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>

      {/* Sidebar */}
      <aside className="w-[240px] bg-white flex flex-col flex-shrink-0">
        <div className="px-7 pt-9 pb-8">
          <p className="text-[22px] font-black text-gray-900 leading-none tracking-tight uppercase">
            ANTI<br />DOUBLE<br />CLAIM
          </p>
          <p className="text-[10px] font-semibold text-gray-400 mt-2.5 tracking-widest uppercase">Portal Mahasiswa</p>
        </div>

        <nav className="flex-1 px-4 space-y-0.5">
          {menus.map((m) => (
            <button
              key={m.key}
              onClick={() => navigateTo(m.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-left transition-colors ${
                activeMenu === m.key
                  ? "text-gray-900 font-bold"
                  : "text-gray-400 font-normal hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Area Kanan */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 w-80">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aktivitas..."
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                {session.user.image ? (
                  <img src={session.user.image} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {session.user.name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-left">
                <p className="text-[13px] font-semibold text-gray-900 leading-tight">{session.user.name}</p>
                <p className="text-[11px] text-gray-400 leading-tight truncate max-w-[160px]">{session.user.email}</p>
              </div>
              <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl border border-gray-100 shadow-lg z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-sm font-semibold text-gray-900 truncate">{session.user.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{session.user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { navigateTo("profil"); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profil Saya
                    </button>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Keluar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Konten */}
        <main className="flex-1 px-10 py-10 overflow-y-auto">
          {activeMenu === "daftar"      && <DaftarKlaim key={claimsRefreshKey} session={session} search={search}
                                              onOpenForm={(id) => { setRewardOpenId(id); navigateTo("reward"); }}
                                              onTambahKlaim={() => setShowTambah(true)} />}
          {activeMenu === "reward"      && <KonfirmasiReward session={session} initialClaimId={rewardOpenId} onClearInitial={() => setRewardOpenId(null)} />}
          {activeMenu === "visualisasi" && <VisualisasiData />}
          {activeMenu === "sk-rektor"   && <SKRektor />}
          {activeMenu === "profil"      && <ProfilPanel session={session} onBack={() => navigateTo("daftar")} />}
        </main>
      </div>

      {/* Wizard Tambah Klaim */}
      {showTambah && (
        <TambahKlaimWizard
          session={session}
          onClose={() => setShowTambah(false)}
          onSuccess={handleClaimSuccess}
        />
      )}
    </div>
  );
}
