import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_SESION,
  SESION_MAX_AGE_SEGUNDOS,
  compararSeguro,
  crearSesionToken,
  verificarContrasena,
  type IdentidadSesion,
} from "@/lib/auth";
import { query } from "@/lib/db";
import { DOCTORA } from "@/lib/panel-data";

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

  let identidad: IdentidadSesion | null = null;

  // Cuenta admin original por variables de entorno — se mantiene por
  // compatibilidad con lo ya configurado en Railway. No está ligada a
  // una fila de `usuarios`, así que queda registrada con el nombre de
  // la doctora y rol admin.
  const usuarioEnv = process.env.APP_LOGIN_USER;
  const passEnv = process.env.APP_LOGIN_PASSWORD;
  if (usuarioEnv && passEnv && compararSeguro(usuarioNorm, usuarioEnv.trim().toLowerCase()) && compararSeguro(contrasena, passEnv)) {
    identidad = { usuarioId: null, nombre: DOCTORA.nombre, rol: "admin" };
  }

  // Cuentas creadas desde Perfil → Usuarios (tabla `usuarios`).
  if (!identidad) {
    const { rows } = await query<{ id: number; nombre: string; contrasena_hash: string; rol: "admin" | "asistente" }>(
      `SELECT id, nombre, contrasena_hash, rol FROM usuarios WHERE lower(usuario) = $1`,
      [usuarioNorm]
    );
    if (rows.length > 0 && (await verificarContrasena(contrasena, rows[0].contrasena_hash))) {
      identidad = { usuarioId: rows[0].id, nombre: rows[0].nombre, rol: rows[0].rol };
    }
  }

  if (!identidad) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const token = await crearSesionToken(identidad);
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
