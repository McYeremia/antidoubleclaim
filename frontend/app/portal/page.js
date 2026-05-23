"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const API        = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const apiFetch = (url, options = {}) => fetch(url, { ...options, headers: { "ngrok-skip-browser-warning": "true", ...(options.headers || {}) } });
const SESSION_MS = 3 * 60 * 60 * 1000;

function isOperatorSessionValid() {
  const loginAt = localStorage.getItem("operator_login_at");
  if (!loginAt) return false;
  return Date.now() - Number(loginAt) < SESSION_MS;
}

export default function OperatorLoginPage() {
  const router = useRouter();
  const [username,     setUsername]     = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const submitted = useRef(false);

  const [fpStep,      setFpStep]      = useState(null); // null | 'email' | 'otp' | 'success'
  const [fpEmail,     setFpEmail]     = useState("");
  const [fpOtp,       setFpOtp]       = useState("");
  const [fpNewPw,     setFpNewPw]     = useState("");
  const [fpConfirmPw, setFpConfirmPw] = useState("");
  const [fpError,     setFpError]     = useState("");
  const [fpLoading,   setFpLoading]   = useState(false);
  const [fpShowPw,    setFpShowPw]    = useState(false);

  const closeFp = () => {
    setFpStep(null); setFpEmail(""); setFpOtp("");
    setFpNewPw(""); setFpConfirmPw(""); setFpError("");
    setFpLoading(false); setFpShowPw(false);
  };

  const handleFpEmail = async (e) => {
    e.preventDefault();
    setFpError(""); setFpLoading(true);
    try {
      await apiFetch(`${API}/operator/lupa-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail }),
      });
      setFpStep("otp");
    } catch {
      setFpError("Tidak dapat terhubung ke server.");
    } finally {
      setFpLoading(false);
    }
  };

  const handleFpReset = async (e) => {
    e.preventDefault();
    if (fpNewPw.length < 8) { setFpError("Password baru minimal 8 karakter."); return; }
    if (fpNewPw !== fpConfirmPw) { setFpError("Konfirmasi password tidak cocok."); return; }
    setFpError(""); setFpLoading(true);
    try {
      const res = await apiFetch(`${API}/operator/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail, otp: fpOtp, new_password: fpNewPw }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFpError(d.detail || "OTP tidak valid atau sudah kadaluarsa.");
        return;
      }
      setFpStep("success");
    } catch {
      setFpError("Tidak dapat terhubung ke server.");
    } finally {
      setFpLoading(false);
    }
  };

  useEffect(() => {
    if (isOperatorSessionValid()) router.replace("/operator");
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitted.current) return;
    submitted.current = true;
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/login-operator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Username atau password salah.");
        submitted.current = false;
        return;
      }
      const { user } = await res.json();
      localStorage.setItem("role",              "operator");
      localStorage.setItem("operator_id",       String(user.id));
      localStorage.setItem("operator_nama",     user.nama);
      localStorage.setItem("operator_username", user.username);
      localStorage.setItem("operator_role",     user.role);
      localStorage.setItem("operator_login_at", String(Date.now()));
      router.push("/operator");
    } catch {
      setError("Tidak dapat terhubung ke server. Pastikan backend berjalan.");
      submitted.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>

      {/* Panel Kiri */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#046137] relative flex-col items-center justify-center px-16 overflow-hidden">
        {/* Dekorasi lingkaran */}
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-white/5" />
        <div className="absolute -bottom-40 -left-24 w-[480px] h-[480px] rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03]" />
        <div className="absolute top-16 left-16 w-24 h-24 rounded-full bg-white/5" />
        <div className="absolute bottom-24 right-20 w-16 h-16 rounded-full bg-white/5" />

        {/* Konten */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <img src="/logo-ukdw.png" alt="UKDW" className="h-28 w-auto object-contain mb-8" />
          <div className="w-16 h-px bg-white/20 mb-8" />
          <img src="/biro3-putih.png" alt="Biro Kemahasiswaan" className="h-16 w-auto object-contain mb-10 opacity-90" />
          <h2 className="text-white/90 text-[15px] font-bold tracking-[0.2em] uppercase mb-2">
            Portal Pengelola Sistem
          </h2>
          <p className="text-white/50 text-[12px] tracking-widest uppercase">
            Universitas Kristen Duta Wacana
          </p>
        </div>

        <p className="absolute bottom-8 text-white/30 text-[10px] tracking-widest uppercase">
          &copy; {new Date().getFullYear()} Kemahasiswaan UKDW
        </p>
      </div>

      {/* Panel Kanan */}
      <div className="flex-1 bg-[#f7f7f8] flex flex-col items-center justify-center px-8 py-12">

        {/* Logo mobile */}
        <div className="flex lg:hidden items-center gap-4 mb-10">
          <img src="/logo-ukdw.png" alt="UKDW" className="h-14 w-auto object-contain" />
          <div className="w-px h-10 bg-gray-300" />
          <img src="/biro3-putih.png" alt="Biro Kemahasiswaan" className="h-10 w-auto object-contain" />
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-10">
            <h1 className="text-[28px] font-black text-gray-900 leading-tight tracking-tight">
              Portal Pengelola
            </h1>
            <p className="text-gray-400 text-[13px] mt-1.5">Masuk dengan akun operator untuk melanjutkan</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                Username
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder="Masukkan username"
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#046137] transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Masukkan password"
                  className="w-full px-4 py-3.5 pr-12 bg-white border border-gray-200 rounded-2xl text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#046137] transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-[#046137] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 px-4 py-3.5 bg-red-50 border border-red-100 rounded-2xl">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[13px] font-bold text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#046137] hover:bg-[#035230] disabled:opacity-50 text-white text-[14px] font-bold rounded-2xl transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-green-900/20"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Memverifikasi...
                </div>
              ) : "Masuk ke Sistem"}
            </button>

            <button
              type="button"
              onClick={() => setFpStep("email")}
              className="w-full text-center text-[12px] font-bold text-gray-400 hover:text-[#046137] transition-colors"
            >
              Lupa Password?
            </button>
          </form>

          <p className="text-center text-[11px] text-gray-300 font-medium mt-10 uppercase tracking-widest leading-relaxed">
            Halaman ini hanya untuk pengelola sistem.<br />
            &copy; {new Date().getFullYear()} Kemahasiswaan UKDW
          </p>
        </div>
      </div>

      {/* Modal Lupa Password */}
      {fpStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={closeFp}>
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>

            {fpStep === "success" ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[16px] font-black text-gray-900 mb-1">Password Berhasil Direset!</p>
                <p className="text-[13px] text-gray-400 mb-6">Silakan login dengan password baru Anda.</p>
                <button onClick={closeFp}
                  className="px-8 py-3 bg-[#046137] text-white rounded-xl text-[13px] font-black hover:bg-[#035230] transition-colors">
                  Kembali ke Login
                </button>
              </div>

            ) : fpStep === "email" ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[#f0f7f3] flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-[#046137]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-black text-gray-900 mb-1">Lupa Password?</h3>
                <p className="text-[13px] text-gray-400 mb-6">Masukkan email akun operator Anda. Kode OTP akan dikirim ke email tersebut.</p>
                <form onSubmit={handleFpEmail} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Email Operator <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email" required autoFocus
                      value={fpEmail}
                      onChange={e => { setFpEmail(e.target.value); setFpError(""); }}
                      placeholder="email@kampus.ac.id"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#046137]/30 focus:border-[#046137] transition-all"
                    />
                  </div>
                  {fpError && <p className="text-[12px] font-bold text-red-600">! {fpError}</p>}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button type="button" onClick={closeFp}
                      className="px-5 py-2.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 transition-colors">
                      Batal
                    </button>
                    <button type="submit" disabled={fpLoading}
                      className="px-6 py-2.5 rounded-xl text-[12px] font-black bg-[#046137] text-white hover:bg-[#035230] disabled:opacity-40 transition-colors">
                      {fpLoading ? "MENGIRIM..." : "KIRIM OTP"}
                    </button>
                  </div>
                </form>
              </>

            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[#f0f7f3] flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-[#046137]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-black text-gray-900 mb-1">Masukkan Kode OTP</h3>
                <p className="text-[13px] text-gray-400 mb-6">
                  Kode OTP dikirim ke <strong className="text-gray-700">{fpEmail}</strong>. Berlaku 15 menit.
                </p>
                <form onSubmit={handleFpReset} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Kode OTP <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text" required autoFocus maxLength={6}
                      value={fpOtp}
                      onChange={e => { setFpOtp(e.target.value.replace(/\D/g, "")); setFpError(""); }}
                      placeholder="000000"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[20px] font-mono text-center text-gray-900 tracking-[0.6em] focus:outline-none focus:ring-2 focus:ring-[#046137]/30 focus:border-[#046137] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Password Baru <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={fpShowPw ? "text" : "password"} required
                        value={fpNewPw}
                        onChange={e => { setFpNewPw(e.target.value); setFpError(""); }}
                        placeholder="Minimal 8 karakter"
                        className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#046137]/30 focus:border-[#046137] transition-all"
                      />
                      <button type="button" tabIndex={-1} onClick={() => setFpShowPw(v => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-300 hover:text-[#046137] transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {fpShowPw
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                          }
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Konfirmasi Password Baru <span className="text-red-400">*</span>
                    </label>
                    <input
                      type={fpShowPw ? "text" : "password"} required
                      value={fpConfirmPw}
                      onChange={e => { setFpConfirmPw(e.target.value); setFpError(""); }}
                      placeholder="Ulangi password baru"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#046137]/30 focus:border-[#046137] transition-all"
                    />
                  </div>
                  {fpError && <p className="text-[12px] font-bold text-red-600">! {fpError}</p>}
                  <div className="flex items-center justify-between pt-2">
                    <button type="button"
                      onClick={() => { setFpStep("email"); setFpOtp(""); setFpNewPw(""); setFpConfirmPw(""); setFpError(""); }}
                      className="text-[12px] font-bold text-gray-400 hover:text-gray-700 transition-colors">
                      ← Ganti Email
                    </button>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={closeFp}
                        className="px-5 py-2.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 transition-colors">
                        Batal
                      </button>
                      <button type="submit" disabled={fpLoading || fpOtp.length !== 6}
                        className="px-6 py-2.5 rounded-xl text-[12px] font-black bg-[#046137] text-white hover:bg-[#035230] disabled:opacity-40 transition-colors">
                        {fpLoading ? "MENYIMPAN..." : "RESET PASSWORD"}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}

    </main>
  );
}
