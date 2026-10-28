// Helper server-side untuk meneruskan request ke backend FastAPI (pola BFF / backend-for-frontend).
// Browser tidak pernah memanggil backend langsung: semua lewat route Next.js yang memeriksa login dulu,
// lalu meneruskan identitas yang sudah diverifikasi + kunci internal ke backend.
// Folder berawalan "_" tidak dijadikan route oleh Next.js.
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Alamat backend dilihat dari server Next.js (bukan dari browser), mis. http://127.0.0.1:8000
export const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
const INTERNAL_API_KEY   = process.env.INTERNAL_API_KEY || "";

// Nama cookie httpOnly yang menyimpan token sesi operator (tidak bisa dibaca JavaScript di browser)
export const OPERATOR_COOKIE = "adc_op";
export const OPERATOR_SESSION_SECONDS = 3 * 60 * 60; // 3 jam, sama dengan masa berlaku sesi di backend

// Menyusun header identitas untuk backend dari cookie operator atau session Google mahasiswa.
// Header identitas apa pun yang dikirim browser tidak pernah diteruskan.
export async function identityHeaders(request) {
  const headers = { "X-Internal-Key": INTERNAL_API_KEY };
  const opToken = request.cookies.get(OPERATOR_COOKIE)?.value;
  if (opToken) {
    headers["Authorization"] = `Bearer ${opToken}`;
    return headers;
  }
  const session = await getServerSession(authOptions);
  const email   = session?.user?.email;
  if (email && email.toLowerCase().endsWith("@students.ukdw.ac.id")) {
    headers["X-Mahasiswa-Email"] = email;
  }
  return headers;
}

// Menolak request pengubah data (POST/PUT/PATCH/DELETE) yang berasal dari situs lain (proteksi CSRF).
export function isCrossSite(request) {
  if (request.method === "GET" || request.method === "HEAD") return false;
  const origin = request.headers.get("origin");
  if (!origin) return false; // browser modern selalu mengirim Origin untuk request lintas situs
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

// Meneruskan respons backend ke browser apa adanya (status, tipe konten, body di-stream).
export function relayResponse(upstream, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  // (X-Content-Type-Options: nosniff dipasang global di next.config.mjs)
  for (const name of ["content-type", "content-disposition", "retry-after", "cache-control", "x-sesi-berakhir"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const noBody = upstream.status === 204 || upstream.status === 304;
  return new Response(noBody ? null : upstream.body, { status: upstream.status, headers });
}

// Cookie sesi operator: Secure hanya jika aplikasi diakses lewat HTTPS (agar tetap bisa dicoba di http://localhost).
export function operatorCookieOptions(request, maxAge = OPERATOR_SESSION_SECONDS) {
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  return { httpOnly: true, sameSite: "lax", secure: proto === "https", path: "/", maxAge };
}
