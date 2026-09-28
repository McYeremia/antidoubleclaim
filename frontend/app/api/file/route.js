// Proxy file dari backend ke browser.
// File tidak diakses langsung dari backend: route ini meneruskan identitas yang sudah diverifikasi
// (session Google mahasiswa atau cookie sesi operator), lalu backend memeriksa apakah pengguna itu
// berhak melihat file tersebut (pemilik, anggota kelompok klaim, atau operator).
import { BACKEND_URL, identityHeaders, relayResponse } from "@/app/api/_lib/backend";

export async function GET(request) {
  const name = request.nextUrl.searchParams.get("name");

  // Cegah path traversal attack: nama file tidak boleh mengandung "..", "/", atau "\"
  // yang bisa digunakan untuk mengakses file di luar folder uploads
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return new Response("Invalid filename", { status: 400 });
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/files/${encodeURIComponent(name)}`, {
      headers: await identityHeaders(request),
      cache:   "no-store",
    });
    if (!upstream.ok) {
      return new Response(upstream.status === 404 ? "File not found" : "Unauthorized", { status: upstream.status });
    }
    return relayResponse(upstream);
  } catch {
    // 502 Bad Gateway: server proxy (Next.js) gagal menghubungi upstream (backend FastAPI)
    return new Response("Failed to fetch file", { status: 502 });
  }
}
