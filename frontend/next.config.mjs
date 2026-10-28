/** @type {import('next').NextConfig} */
const nextConfig = {
  // Header keamanan untuk semua halaman dan route API.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Halaman hanya boleh dimuat di iframe dari aplikasi ini sendiri (mencegah clickjacking).
          // SAMEORIGIN (bukan DENY) karena pratinjau PDF sertifikat ditampilkan lewat iframe /api/file.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          // Browser tidak boleh menebak tipe file dari isinya
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Alamat lengkap halaman tidak dikirim ke situs lain saat pengguna membuka tautan keluar
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
