"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import MahasiswaSidebar from "../_sidebar";
import { API_URL, apiFetch } from "./components/shared";
import TambahKlaimWizard from "./TambahKlaimWizard";
import DaftarKlaim from "./components/DaftarKlaim";
import KonfirmasiReward from "./components/KonfirmasiReward";
import ProfilPanel from "./components/ProfilPanel";
import VisualisasiData from "./components/VisualisasiData";
import SKRektor from "./components/SKRektor";

function MahasiswaDashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeMenu = searchParams.get("menu") || "daftar";

  const [showTambah,       setShowTambah]       = useState(false);
  const [search,           setSearch]           = useState("");
  const [searchReward,     setSearchReward]     = useState("");
  const [claimsRefreshKey, setClaimsRefreshKey] = useState(0);
  const [rewardOpenId,     setRewardOpenId]     = useState(null);
  const [showUserMenu,     setShowUserMenu]     = useState(false);
  const [profil,           setProfil]           = useState(null);

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && !session?.user?.email?.endsWith("@students.ukdw.ac.id"))) {
      router.replace("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;
    apiFetch(`${API_URL}/profil?email=${encodeURIComponent(session.user.email)}`)
      .then(r => r.ok ? r.json() : {})
      .then(p => setProfil(p))
      .catch(() => {});
  }, [status, session]);

  if (status === "loading") {
    return <p className="text-center mt-20 text-gray-400">Memuat sesi...</p>;
  }
  if (status === "unauthenticated" || !session?.user?.email?.endsWith("@students.ukdw.ac.id")) {
    return null;
  }

  const navigateTo = (key) => {
    if (key !== "daftar") setSearch("");
    if (key !== "reward") setSearchReward("");
    const url = key === "daftar"
      ? "/mahasiswa/dashboard"
      : `/mahasiswa/dashboard?menu=${key}`;
    router.push(url);
  };

  const handleClaimSuccess = () => {
    setClaimsRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>

      <MahasiswaSidebar activeKey={activeMenu} />

      {/* Area Kanan */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-16 bg-[#f0f7f3] border-b border-[#d4ebe0] flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex-1">
            {(activeMenu === "daftar" || activeMenu === "reward") && (
              <div className="flex items-center gap-2.5 bg-white border border-[#d4ebe0] rounded-xl px-4 py-2.5 w-[480px]">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={activeMenu === "daftar" ? search : searchReward}
                  onChange={(e) => activeMenu === "daftar" ? setSearch(e.target.value) : setSearchReward(e.target.value)}
                  placeholder="Cari nama lomba, tingkat, peringkat..."
                  className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-[#d4ebe0] transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-[#046137] flex items-center justify-center flex-shrink-0">
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
                                              profil={profil}
                                              profilLengkap={!!(profil?.nomor_wa && profil?.nama_pemilik_rekening && profil?.nomor_rekening?.length === 10)}
                                              onOpenForm={(id) => { setRewardOpenId(id); navigateTo("reward"); }}
                                              onTambahKlaim={() => setShowTambah(true)}
                                              onGoProfil={() => navigateTo("profil")} />}
          {activeMenu === "reward"      && <KonfirmasiReward session={session} search={searchReward} initialClaimId={rewardOpenId} onClearInitial={() => setRewardOpenId(null)} />}
          {activeMenu === "visualisasi" && <VisualisasiData />}
          {activeMenu === "sk-rektor"   && <SKRektor />}
          {activeMenu === "profil"      && <ProfilPanel session={session} onBack={() => navigateTo("daftar")} onProfilSaved={(data) => setProfil(p => ({ ...p, ...data }))} />}
        </main>
      </div>

      {/* Wizard Tambah Klaim */}
      {showTambah && (
        <TambahKlaimWizard
          session={session}
          profil={profil}
          onClose={() => setShowTambah(false)}
          onSuccess={handleClaimSuccess}
        />
      )}
    </div>
  );
}

export default function MahasiswaDashboard() {
  return (
    <Suspense fallback={null}>
      <MahasiswaDashboardContent />
    </Suspense>
  );
}
