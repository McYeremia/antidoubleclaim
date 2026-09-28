// Perantara (BFF) semua pemanggilan API dari browser ke backend FastAPI.
// Browser memanggil /api/backend/<endpoint>; route ini menambahkan identitas yang sudah diverifikasi
// (session Google mahasiswa atau cookie sesi operator) dan kunci internal, lalu meneruskannya ke backend.
// Backend sendiri tidak menerima request tanpa kunci internal, sehingga tidak bisa dipakai langsung dari luar.
import { BACKEND_URL, identityHeaders, isCrossSite, relayResponse } from "@/app/api/_lib/backend";

const MAX_BODY_BYTES = 25 * 1024 * 1024; // sama dengan MAX_REQUEST_MB default di backend

// Login operator wajib lewat /api/operator/login agar token disimpan di cookie httpOnly, bukan dikembalikan ke JavaScript
const BLOCKED_PATHS = new Set(["login-operator"]);

async function proxy(request, { params }) {
  const { path } = await params;
  const joined = path.map(encodeURIComponent).join("/");

  if (BLOCKED_PATHS.has(joined)) {
    return Response.json({ detail: "Not Found" }, { status: 404 });
  }
  if (isCrossSite(request)) {
    return Response.json({ detail: "Akses ditolak" }, { status: 403 });
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) {
    return Response.json({ detail: "Ukuran request melebihi batas 25 MB" }, { status: 413 });
  }

  // Hanya header yang dibutuhkan backend yang diteruskan; header identitas dari browser dibuang
  const headers = await identityHeaders(request);
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const hasBody = !["GET", "HEAD"].includes(request.method);
  try {
    const upstream = await fetch(`${BACKEND_URL}/${joined}${request.nextUrl.search}`, {
      method:  request.method,
      headers,
      body:    hasBody ? await request.arrayBuffer() : undefined,
      cache:   "no-store",
    });
    return relayResponse(upstream);
  } catch {
    return Response.json({ detail: "Tidak dapat terhubung ke server backend." }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
