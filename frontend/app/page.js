"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const OPERATOR_PASSWORD = "operator";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState("mahasiswa");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleOperatorLogin = (e) => {
    e.preventDefault();
    setError("");
    if (password === OPERATOR_PASSWORD) {
      sessionStorage.setItem("role", "operator");
      router.push("/operator");
    } else {
      setError("Password salah. Silakan coba lagi.");
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError("");
    await signIn("google", { callbackUrl: "/mahasiswa" });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">

        {/* Logo / Judul */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-xl mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Anti-Double Claim</h1>
          <p className="text-sm text-gray-500 mt-1">Sistem Deteksi Klaim Sertifikat Ganda</p>
        </div>

        {/* Pilih Role */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Login sebagai</label>
          <div className="grid grid-cols-2 gap-3">
            {["mahasiswa", "operator"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setError(""); setPassword(""); }}
                className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  role === r
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Form Mahasiswa — Google Login */}
        {role === "mahasiswa" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
              Gunakan akun Google kampus Anda<br />
              <span className="font-medium text-gray-700">@students.ukdw.ac.id</span>
            </p>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <button
              onClick={handleGoogleLogin}
              disabled={loadingGoogle}
              className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loadingGoogle ? "Mengarahkan..." : "Masuk dengan Google"}
            </button>
          </div>
        )}

        {/* Form Operator — Password */}
        {role === "operator" && (
          <form onSubmit={handleOperatorLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Masukkan password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Masuk
            </button>
          </form>
        )}

      </div>
    </main>
  );
}
