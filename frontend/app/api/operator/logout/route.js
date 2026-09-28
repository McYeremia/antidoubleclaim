// Logout operator: mengakhiri sesi di backend lalu menghapus cookie token.
import { NextResponse } from "next/server";
import { BACKEND_URL, OPERATOR_COOKIE, isCrossSite, operatorCookieOptions } from "@/app/api/_lib/backend";

export async function POST(request) {
  if (isCrossSite(request)) {
    return NextResponse.json({ detail: "Akses ditolak" }, { status: 403 });
  }
  const token = request.cookies.get(OPERATOR_COOKIE)?.value;
  if (token) {
    // Gagal menghubungi backend tidak menghalangi logout; cookie tetap dihapus
    await fetch(`${BACKEND_URL}/operator/logout`, {
      method:  "POST",
      headers: { "X-Internal-Key": process.env.INTERNAL_API_KEY || "", Authorization: `Bearer ${token}` },
      cache:   "no-store",
    }).catch(() => {});
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set(OPERATOR_COOKIE, "", operatorCookieOptions(request, 0));
  return res;
}
