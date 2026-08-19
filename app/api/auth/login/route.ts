import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, SESION_MAX_AGE_SEGUNDOS, compararSeguro, crearSesionToken, verificarContrasena } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const usuario = body?.usuario;
  const contrasena = body?.contrasena;

  if (typeof usuario !== "string" || typeof contrasena !== "string") {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  // El usuario no es sensible a mayúsculas/espacios (evita fallos por
  // autocapitalización del teclado en celular); la contraseña sí.
  const usuarioNorm = usuario.trim().toLowerCase();

  let ok = false;

  // Cuenta admin original por variables de entorno — se mantiene por
  // compatibilidad con lo ya configurado en Railway.
  const usuarioEnv = process.env.APP_LOGIN_USER;
  const passEnv = process.env.APP_LOGIN_PASSWORD;
  if (usuarioEnv && passEnv) {
    ok = compararSeguro(usuarioNorm, usuarioEnv.trim().toLowerCase()) && compararSeguro(contrasena, passEnv);
  }

  // Cuentas creadas desde Perfil → Usuarios (tabla `usuarios`).
  if (!ok) {
    const { rows } = await query<{ contrasena_hash: string }>(
      `SELECT contrasena_hash FROM usuarios WHERE lower(usuario) = $1`,
      [usuarioNorm]
    );
    if (rows.length > 0) {
      ok = await verificarContrasena(contrasena, rows[0].contrasena_hash);
    }
  }

  if (!ok) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const token = await crearSesionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESION_MAX_AGE_SEGUNDOS,
  });
  return res;
}
