"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CREDENTIALS = {
  mahasiswa: { password: "mahasiswa", redirect: "/mahasiswa" },
  operator: { password: "operator", redirect: "/operator" },
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState("mahasiswa");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    const cred = CREDENTIALS[role];
    if (password === cred.password) {
      sessionStorage.setItem("role", role);
      router.push(cred.redirect);
    } else {
      setError("Password salah. Silakan coba lagi.");
    }
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

        <form onSubmit={handleLogin} className="space-y-5">

          {/* Pilih Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Login sebagai</label>
            <div className="grid grid-cols-2 gap-3">
              {["mahasiswa", "operator"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setRole(r); setError(""); }}
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

          {/* Password */}
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

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          {/* Tombol Login */}
          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Masuk
          </button>
        </form>
      </div>
    </main>
  );
}
