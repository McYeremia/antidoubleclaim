"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PengajuanClaim          from "./components/PengajuanClaim";
import PengajuanReward          from "./components/PengajuanReward";
import KelolaOperator            from "./components/KelolaOperator";
import PengaturanPeriode         from "./components/PengaturanPeriode";
import ArsipPeriode              from "./components/ArsipPeriode";
import VisualisasiDataOperator   from "./components/VisualisasiDataOperator";
import LogAktivitas              from "./components/LogAktivitas";
import SimulatorDeteksi         from "./components/SimulatorDeteksi";

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
const IconChart = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconLog = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);
const IconBeaker = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

export default function OperatorDashboard() {
  const router = useRouter();
  const [activeMenu,   setActiveMenu]   = useState("claim");
  const [operatorNama, setOperatorNama] = useState("");
  const [operatorRole, setOperatorRole] = useState("");
  const [operatorId,   setOperatorId]   = useState(null);
  const [showUserMenu,      setShowUserMenu]      = useState(false);
  const [periodeLabel,      setPeriodeLabel]      = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm,            setPwForm]            = useState({ old: "", new: "", confirm: "" });
  const [pwError,           setPwError]           = useState("");
  const [pwSaving,          setPwSaving]          = useState(false);
  const [pwSuccess,         setPwSuccess]         = useState(false);

  useEffect(() => {
    const loginAt = localStorage.getItem("operator_login_at");
    const expired = !loginAt || Date.now() - Number(loginAt) > 3 * 60 * 60 * 1000;
    if (localStorage.getItem("role") !== "operator" || expired) {
      ["role","operator_id","operator_nama","operator_username","operator_role","operator_login_at"]
        .forEach(k => localStorage.removeItem(k));
      router.replace("/portal");
      return;
    }
    setOperatorNama(localStorage.getItem("operator_nama") || "Operator");
    setOperatorRole(localStorage.getItem("operator_role") || "operator");
    setOperatorId(localStorage.getItem("operator_id"));
    const getMenuFromUrl = () =>
      new URLSearchParams(window.location.search).get("menu") || "claim";
    setActiveMenu(getMenuFromUrl());

    const handlePop = () => setActiveMenu(getMenuFromUrl());
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [router]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/periode/aktif")
      .then(r => r.ok ? r.json() : { aktif: false })
      .then(p => setPeriodeLabel(p.aktif && p.periode?.nama ? p.periode.nama : null))
      .catch(() => setPeriodeLabel(null));
  }, [activeMenu]);

  const navigateTo = (key) => {
    setActiveMenu(key);
    const url = key === "claim"
      ? window.location.pathname
      : `${window.location.pathname}?menu=${key}`;
    window.history.pushState({ menu: key }, "", url);
  };

  const handleSelfPassword = async (e) => {
    e.preventDefault();
    if (pwForm.new.length < 6) { setPwError("Password baru minimal 6 karakter."); return; }
    if (pwForm.new !== pwForm.confirm) { setPwError("Konfirmasi password tidak cocok."); return; }
    setPwSaving(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/operators/${operatorId}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-operator-id": String(operatorId) },
        body: JSON.stringify({ old_password: pwForm.old, new_password: pwForm.new }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setPwError(d.detail || "Gagal mengganti password.");
        return;
      }
      setPwSuccess(true);
      setPwForm({ old: "", new: "", confirm: "" });
      setPwError("");
      setTimeout(() => { setShowPasswordModal(false); setPwSuccess(false); }, 1500);
    } catch {
      setPwError("Tidak dapat terhubung ke server.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => {
    ["role","operator_id","operator_nama","operator_username","operator_role","operator_login_at"]
      .forEach(k => localStorage.removeItem(k));
    router.push("/portal");
  };

  const isSuperAdmin = operatorRole === "superadmin";

  const menus = [
    { key: "claim",       label: "Pengajuan Claim",   icon: <IconClaim />    },
    { key: "reward",      label: "Pengajuan Reward",  icon: <IconReward />   },
    { key: "visualisasi", label: "Visualisasi Data",  icon: <IconChart />    },
    { key: "simulator",   label: "Simulator Deteksi",  icon: <IconBeaker />   },
    ...(isSuperAdmin ? [
      { key: "operators", label: "Kelola Operator",    icon: <IconUsers />    },
      { key: "periode",   label: "Pengaturan Periode", icon: <IconCalendar /> },
      { key: "arsip",     label: "Arsip Periode",      icon: <IconArchive />  },
      { key: "log",       label: "Log Aktivitas",      icon: <IconLog />      },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>

      {/* Sidebar */}
      <aside className="w-[240px] bg-[#046137] flex flex-col flex-shrink-0 h-screen sticky top-0">
        <div className="px-7 pt-9 pb-8">
          <img src="/logo_utama.png" alt="Anti Double Claim" className="h-20 w-auto object-contain" />
          <p className="text-[10px] font-semibold text-white/50 mt-2.5 tracking-widest uppercase">Portal Pengelola</p>
        </div>
        <nav className="flex-1 px-4 space-y-0.5">
          {menus.map((m) => (
            <button
              key={m.key}
              onClick={() => navigateTo(m.key)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-left transition-colors overflow-hidden
                ${activeMenu === m.key
                  ? "text-white font-bold bg-white/10"
                  : "text-white/70 font-medium hover:text-white hover:bg-white/10"
                }`}
            >
              {activeMenu === m.key && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-white rounded-full" />
              )}
              {m.icon}
              {m.label}
            </button>
          ))}
        </nav>
        <div className="px-7 py-6 border-t border-white/10">
          <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest leading-none">UKDW</p>
          <p className="text-[10px] text-white/40 mt-1 leading-snug">Universitas Kristen<br />Duta Wacana</p>
          <p className="text-[10px] text-white/30 mt-3 tabular-nums">© {new Date().getFullYear()}</p>
        </div>
      </aside>

      {/* Area Kanan */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-[#f0f7f3] border-b border-[#d4ebe0] flex items-center justify-between px-8 flex-shrink-0">
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
                <span className="text-xs font-bold text-white uppercase">
                  {operatorNama.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </span>
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
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-2xl z-20 overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-1.5">
                    <button
                      onClick={() => { setShowUserMenu(false); setShowPasswordModal(true); setPwForm({ old: "", new: "", confirm: "" }); setPwError(""); setPwSuccess(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Ganti Password
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Keluar Sesi
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 px-10 py-10 overflow-y-auto">
          {activeMenu === "claim"       && <PengajuanClaim router={router} />}
          {activeMenu === "reward"      && <PengajuanReward />}
          {activeMenu === "visualisasi" && <VisualisasiDataOperator />}
          {activeMenu === "simulator"   && <SimulatorDeteksi />}
          {activeMenu === "operators"   && isSuperAdmin && <KelolaOperator operatorId={operatorId} />}
          {activeMenu === "periode"     && isSuperAdmin && <PengaturanPeriode operatorNama={operatorNama} operatorId={operatorId} />}
          {activeMenu === "arsip"       && isSuperAdmin && <ArsipPeriode />}
          {activeMenu === "log"         && isSuperAdmin && <LogAktivitas operatorId={operatorId} />}
        </main>
      </div>

      {/* Modal Ganti Password (Self-Service) */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
             onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8"
               onClick={e => e.stopPropagation()}>
            {pwSuccess ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[15px] font-black text-gray-900">Password berhasil diganti!</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[#f0f7f3] flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-[#046137]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-black text-gray-900 mb-1">Ganti Password</h3>
                <p className="text-[13px] text-gray-400 mb-6">Masukkan password lama dan password baru Anda.</p>
                <form onSubmit={handleSelfPassword} className="space-y-4">
                  {[
                    { label: "Password Lama",            key: "old",     placeholder: "Masukkan password saat ini" },
                    { label: "Password Baru",            key: "new",     placeholder: "Minimal 6 karakter" },
                    { label: "Konfirmasi Password Baru", key: "confirm", placeholder: "Ulangi password baru" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        {f.label} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        autoFocus={f.key === "old"}
                        value={pwForm[f.key]}
                        onChange={e => { setPwForm(v => ({ ...v, [f.key]: e.target.value })); setPwError(""); }}
                        placeholder={f.placeholder}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#046137]/30 focus:border-[#046137] transition-all"
                      />
                    </div>
                  ))}
                  {pwError && (
                    <p className="text-[12px] font-bold text-red-600 italic">! {pwError}</p>
                  )}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="px-5 py-2.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={pwSaving}
                      className="px-6 py-2.5 rounded-xl text-[12px] font-black bg-[#046137] text-white hover:bg-[#035230] disabled:opacity-40 transition-colors"
                    >
                      {pwSaving ? "MENYIMPAN..." : "SIMPAN PASSWORD"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
