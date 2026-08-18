import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, verificarSesionToken } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/pacientes/:path*",
    "/api/citas/:path*",
    "/api/pagos/:path*",
    "/api/dashboard/:path*",
    "/api/bot/:path*",
  ],
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_SESION)?.value;
  const autenticado = await verificarSesionToken(token);
  if (autenticado) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "no autenticado" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
