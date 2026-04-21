"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const API        = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SESSION_MS = 8 * 60 * 60 * 1000;

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
      const res = await fetch(`${API}/login-operator`, {
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
          </form>

          <p className="text-center text-[11px] text-gray-300 font-medium mt-10 uppercase tracking-widest leading-relaxed">
            Halaman ini hanya untuk pengelola sistem.<br />
            &copy; {new Date().getFullYear()} Kemahasiswaan UKDW
          </p>
        </div>
      </div>

    </main>
  );
}
