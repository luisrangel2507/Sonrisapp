import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, COOKIE_TV, leerSesion, verificarTokenTv } from "@/lib/auth";
import { sesionVigente } from "@/lib/sesion-vigente";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tv",
    "/api/tv/:path*",
    "/api/tratamientos/:path*",
    "/api/caja/:path*",
    "/api/ortodoncia/:path*",
    "/api/pacientes/:path*",
    "/api/citas/:path*",
    "/api/pagos/:path*",
    "/api/dashboard/:path*",
    "/api/reportes/:path*",
    "/api/precios-servicios/:path*",
    "/api/estados-diente/:path*",
    "/api/perfil/:path*",
    "/api/inventario/:path*",
    "/api/usuarios/:path*",
    "/api/push/:path*",
    "/api/auth/webauthn/registro/:path*",
    "/api/auth/webauthn/passkeys",
    "/api/auth/sesion",
    "/api/auth/cerrar-sesiones",
    "/api/auth/dos-pasos/:path*",
  ],
};

// Secciones que el rol Asistente no puede abrir.
const SOLO_ADMIN = [
  "/dashboard/reportes",
  "/dashboard/caja",
  "/api/reportes",
  "/api/caja",
  "/api/perfil/respaldo",
  "/api/auth/cerrar-sesiones",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sesion = await leerSesion(req.cookies.get(COOKIE_SESION)?.value);
  if (sesion && (await sesionVigente(sesion.identidad, sesion.iat))) {
    // El rol Asistente no ve dinero del consultorio ni la administración.
    if (sesion.identidad.rol === "asistente" && SOLO_ADMIN.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "solo un administrador puede ver esto" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // La TV vinculada solo puede ver su pantalla y leer lo que muestra.
  // /tv?clave=… es el link para vincular una TV nueva: la página canjea la
  // clave (POST /api/tv/activar) y no muestra nada antes de eso.
  if (pathname === "/tv" && req.nextUrl.searchParams.has("clave")) return NextResponse.next();
  const rutaTv = pathname === "/tv" || (pathname === "/api/tv" && req.method === "GET");
  if (rutaTv && (await verificarTokenTv(req.cookies.get(COOKIE_TV)?.value))) return NextResponse.next();
  // Activar una TV con su clave no requiere sesión (la clave es la prueba).
  if (pathname === "/api/tv/activar") return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "no autenticado" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
