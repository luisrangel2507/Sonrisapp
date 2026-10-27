import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { COOKIE_SESION, identidadDesdeRequest } from "@/lib/auth";
import { olvidarCacheSesiones } from "@/lib/sesion-vigente";
import { errorJson } from "@/lib/api-error";

// Cierra TODAS las sesiones abiertas en todos los dispositivos (por si se
// pierde un celular o se sospecha que alguien entró). Quien lo pide
// también tendrá que volver a entrar.
export async function POST(req: NextRequest) {
  try {
    const identidad = await identidadDesdeRequest(req);
    if (identidad.rol !== "admin") {
      return NextResponse.json({ error: "solo un administrador puede hacer esto" }, { status: 403 });
    }
    await query(`UPDATE seguridad SET sesiones_validas_desde = now() WHERE id = 1`);
    olvidarCacheSesiones();
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(COOKIE_SESION);
    return res;
  } catch (err) {
    return errorJson(err);
  }
}
