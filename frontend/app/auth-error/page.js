"use client";

import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-xl mb-4">
          <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
        <p className="text-sm text-gray-500 mb-6">
          Hanya akun Google dengan email <span className="font-semibold text-gray-700">@students.ukdw.ac.id</span> yang dapat login sebagai mahasiswa.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Kembali ke Login
        </Link>
      </div>
    </main>
  );
}
