// Login operator: meneruskan username & password ke backend, lalu menyimpan token sesi di cookie httpOnly.
// Token tidak pernah dikirim ke JavaScript browser; browser hanya menerima data tampilan (id, nama, role).
import { NextResponse } from "next/server";
import { BACKEND_URL, OPERATOR_COOKIE, isCrossSite, operatorCookieOptions } from "@/app/api/_lib/backend";

export async function POST(request) {
  if (isCrossSite(request)) {
    return NextResponse.json({ detail: "Akses ditolak" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  let upstream;
  try {
    upstream = await fetch(`${BACKEND_URL}/login-operator`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Key": process.env.INTERNAL_API_KEY || "" },
      body:    JSON.stringify({ username: body.username ?? "", password: body.password ?? "" }),
      cache:   "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Tidak dapat terhubung ke server backend." }, { status: 502 });
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok || !data.token) {
    return NextResponse.json({ detail: data.detail || "Username atau password salah" }, { status: upstream.status || 401 });
  }

  const res = NextResponse.json({ success: true, user: data.user });
  res.cookies.set(OPERATOR_COOKIE, data.token, operatorCookieOptions(request));
  return res;
}
