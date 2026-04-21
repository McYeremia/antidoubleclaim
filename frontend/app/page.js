"use client";

import { useState, useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const ERROR_MAP = {
  OAuthAccountNotLinked: "Akun ini sudah terdaftar dengan metode lain.",
  OAuthSignin:           "Gagal memulai proses login Google.",
  OAuthCallback:         "Terjadi kesalahan saat kembali dari Google.",
  Callback:              "Terjadi kesalahan saat memproses login.",
  AccessDenied:          "Akun Anda tidak terdaftar. Gunakan email @students.ukdw.ac.id.",
  Default:               "Login gagal. Pastikan menggunakan email @students.ukdw.ac.id.",
};

export default function LoginPage() {
  const { status } = useSession();
  const router     = useRouter();
  const params     = useSearchParams();
  const [loading, setLoading] = useState(false);
  const submitted  = useRef(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/mahasiswa/dashboard");
  }, [status, router]);

  const errorCode = params.get("error");
  const errorMsg  = errorCode ? (ERROR_MAP[errorCode] ?? ERROR_MAP.Default) : null;

  const handleGoogleLogin = () => {
    if (submitted.current || loading) return;
    submitted.current = true;
    setLoading(true);
    signIn("google", { callbackUrl: "/mahasiswa/dashboard" });
  };

  if (status === "loading" || status === "authenticated") return null;

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
          <img src="/biro3.png" alt="Biro Kemahasiswaan" className="h-16 w-auto object-contain mb-10 opacity-90" />
          <h2 className="text-white/90 text-[15px] font-bold tracking-[0.2em] uppercase mb-2">
            Sistem Pengelolaan Prestasi
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
          <img src="/biro3.png" alt="Biro Kemahasiswaan" className="h-10 w-auto object-contain" />
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-10">
            <h1 className="text-[28px] font-black text-gray-900 leading-tight tracking-tight">
              Selamat Datang
            </h1>
            <p className="text-gray-400 text-[13px] mt-1.5">Masuk untuk melanjutkan ke portal mahasiswa</p>
          </div>

          <div className="space-y-5">
            {errorMsg && (
              <div className="flex items-center gap-3 px-4 py-3.5 bg-red-50 border border-red-100 rounded-2xl">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[13px] font-bold text-red-600">{errorMsg}</p>
              </div>
            )}

            <div className="bg-[#f0f7f3] rounded-2xl px-5 py-4 border border-[#d4ebe0]">
              <p className="text-[12px] text-gray-500 leading-relaxed">
                Gunakan akun Google institusi Anda&nbsp;
                <span className="font-bold text-[#046137]">@students.ukdw.ac.id</span>
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-[#046137] hover:bg-[#035230] text-white rounded-2xl text-[14px] font-bold transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-60 shadow-lg shadow-green-900/20"
            >
              {!loading && (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Mengarahkan...
                </div>
              ) : "Masuk dengan Google"}
            </button>
          </div>

          <p className="text-center text-[11px] text-gray-300 font-medium mt-10 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Universitas Kristen Duta Wacana
          </p>
        </div>
      </div>

    </main>
  );
}
