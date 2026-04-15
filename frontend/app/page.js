"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/mahasiswa/dashboard" });
  };

  return (
    <main className="min-h-screen bg-[#f7f7f8] flex items-center justify-center px-4" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>
      <div className="bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 w-full max-w-[440px] p-12 border border-gray-100">

        {/* Logo / Judul */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-2xl mb-6 shadow-lg shadow-gray-200">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-[32px] font-black text-gray-900 leading-tight tracking-tight uppercase">
            ANTI<br />DOUBLE<br />CLAIM
          </h1>
          <div className="h-1 w-12 bg-gray-900 mx-auto mt-6 rounded-full"></div>
          <p className="text-[13px] font-semibold text-gray-400 mt-6 tracking-widest uppercase italic">Sistem Deteksi Klaim Ganda</p>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center">
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Gunakan akun Google institusi Anda<br />
              <span className="font-bold text-gray-900">@students.ukdw.ac.id</span>
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-gray-900 hover:bg-gray-700 text-white rounded-2xl text-[14px] font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 shadow-xl shadow-gray-200"
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
          &copy; 2026 Universitas Kristen Duta Wacana
        </p>
      </div>
    </main>
  );
}
