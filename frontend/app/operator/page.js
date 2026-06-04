// Halaman utama dashboard operator: menampilkan menu aktif, topbar periode, dan modal ganti password.
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Modul layout: sidebar navigasi (file terpisah _sidebar.js)
import OperatorSidebar from "./_sidebar";

// Modul shared: konstanta API_URL dan wrapper fetch dipusatkan di satu file
import { API, apiFetch } from "./components/shared";

// ─── MODUL FITUR (masing-masing file terpisah di /components/) ───────────────
// Setiap modul di bawah ini adalah komponen independen:
// - Mengelola state-nya sendiri
// - Berkomunikasi langsung ke backend API
// - Tidak bergantung satu sama lain
import PengajuanClaim          from "./components/PengajuanClaim";         // daftar & verifikasi klaim
import PengajuanReward          from "./components/PengajuanReward";        // pengelolaan reward mahasiswa
import KelolaOperator            from "./components/KelolaOperator";         // manajemen akun operator (superadmin)
import PengaturanPeriode         from "./components/PengaturanPeriode";      // buka/tutup periode klaim (superadmin)
import ArsipPeriode              from "./components/ArsipPeriode";           // arsip periode lama (superadmin)
import VisualisasiDataOperator   from "./components/VisualisasiDataOperator";// grafik & statistik klaim
import LogAktivitas              from "./components/LogAktivitas";           // audit log aksi operator (superadmin)
import SimulatorDeteksi          from "./components/SimulatorDeteksi";       // pengujian pHash & fuzzy interaktif

// Konten dashboard dibungkus terpisah agar useSearchParams bisa dipakai di dalam Suspense.
function OperatorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Menu aktif dibaca dari query param; default ke "claim" jika tidak ada.
  const activeMenu = searchParams.get("menu") || "claim";

  // ─── STATE ───────────────────────────────────────────────────────────────
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
  const [showPwFields,      setShowPwFields]      = useState({ old: false, new: false, confirm: false });

  // ─── GUARD AUTENTIKASI ────────────────────────────────────────────────────
  // Redirect ke portal jika belum login atau sesi sudah lebih dari 3 jam.
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
  }, [router]);

  // ─── STATUS PERIODE ───────────────────────────────────────────────────────
  // Memuat nama periode aktif setiap kali menu berpindah untuk topbar indicator.
  useEffect(() => {
    apiFetch(`${API}/periode/aktif`)
      .then(r => r.ok ? r.json() : { aktif: false })
      .then(p => setPeriodeLabel(p.aktif && p.periode?.nama ? p.periode.nama : null))
      .catch(() => setPeriodeLabel(null));
  }, [activeMenu]);

  // ─── HANDLER ──────────────────────────────────────────────────────────────
  // Mengganti password operator sendiri; validasi panjang dan konfirmasi sebelum kirim ke API.
  const handleSelfPassword = async (e) => {
    e.preventDefault();
    if (pwForm.new.length < 8) { setPwError("Password baru minimal 8 karakter."); return; }
    if (pwForm.new !== pwForm.confirm) { setPwError("Konfirmasi password tidak cocok."); return; }
    setPwSaving(true);
    try {
      const res = await apiFetch(`${API}/operators/${operatorId}/password`, {
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

  // Menghapus semua data sesi dari localStorage dan redirect ke portal login.
  const handleLogout = () => {
    ["role","operator_id","operator_nama","operator_username","operator_role","operator_login_at"]
      .forEach(k => localStorage.removeItem(k));
    router.push("/portal");
  };

  // Menu superadmin (Kelola Operator, Periode, Arsip, Log) hanya tampil jika role superadmin.
  const isSuperAdmin = operatorRole === "superadmin";

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>

      <OperatorSidebar activeKey={activeMenu} />

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
                      onClick={() => { setShowUserMenu(false); setShowPasswordModal(true); setPwForm({ old: "", new: "", confirm: "" }); setPwError(""); setPwSuccess(false); setShowPwFields({ old: false, new: false, confirm: false }); }}
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

        {/*
          ─── LAZY MODULE SWAP ────────────────────────────────────────────────
          Hanya satu modul yang aktif dan dirender ke DOM pada satu waktu.
          Saat menu berpindah, modul lama di-unmount dan modul baru di-mount.
          Ini adalah bukti modularitas: setiap komponen berdiri sendiri dan
          dapat ditukar tanpa mempengaruhi komponen lain di halaman yang sama.

          Pola: {activeMenu === "X" && <ModulX />}
          - true  → ModulX dirender
          - false → tidak ada DOM yang dihasilkan (tidak ada rendering sia-sia)

          Modul yang ditandai "isSuperAdmin" hanya bisa diakses oleh superadmin.
          ──────────────────────────────────────────────────────────────────── */}
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
                    { label: "Password Baru",            key: "new",     placeholder: "Minimal 8 karakter" },
                    { label: "Konfirmasi Password Baru", key: "confirm", placeholder: "Ulangi password baru" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        {f.label} <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPwFields[f.key] ? "text" : "password"}
                          required
                          autoFocus={f.key === "old"}
                          value={pwForm[f.key]}
                          onChange={e => { setPwForm(v => ({ ...v, [f.key]: e.target.value })); setPwError(""); }}
                          placeholder={f.placeholder}
                          className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#046137]/30 focus:border-[#046137] transition-all"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPwFields(v => ({ ...v, [f.key]: !v[f.key] }))}
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-300 hover:text-[#046137] transition-colors"
                        >
                          {showPwFields[f.key] ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
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

// ─── SUSPENSE BOUNDARY (Modularitas SSR) ─────────────────────────────────────
// OperatorDashboard (default export) dan OperatorDashboardContent dipisahkan menjadi
// dua komponen berbeda. Ini juga bentuk modularitas: pemisahan antara shell halaman
// (yang di-render server) dan konten dinamis (yang membutuhkan browser).
//
// Mengapa perlu Suspense?
// useSearchParams() di dalam OperatorDashboardContent membaca URL di sisi klien.
// Next.js App Router mengharuskan komponen yang menggunakan useSearchParams dibungkus
// Suspense agar server rendering tidak hang menunggu data yang hanya tersedia di browser.
export default function OperatorDashboard() {
  return (
    <Suspense fallback={null}>
      <OperatorDashboardContent />
    </Suspense>
  );
}
