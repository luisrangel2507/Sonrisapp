import type { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { DOCTORA } from "@/lib/panel-data";
import {
  COOKIE_SESION,
  SESION_MAX_AGE_SEGUNDOS,
  compararSeguro,
  crearSesionToken,
  hashContrasena,
  necesitaRehash,
  verificarContrasena,
  type IdentidadSesion,
} from "@/lib/auth";
import { ipDe } from "@/lib/limite-publico";
import { leerTotp, verificarCodigoTotp } from "@/lib/totp";
import { minutosDeBloqueo, registrarIntentoExitoso, registrarIntentoFallido } from "@/lib/login-intentos";

export type ResultadoLogin =
  | { ok: true; identidad: IdentidadSesion }
  | { ok: false; status: number; error: string; requiereCodigo?: boolean };

// Revisa usuario + contraseña (+ código de dos pasos si la cuenta lo tiene)
// con el bloqueo por intentos fallidos. Lo usan /api/auth/login y la
// versión ligera (/ligera) para iPads viejos.
export async function autenticar(req: NextRequest, usuario: unknown, contrasena: unknown, codigo: unknown): Promise<ResultadoLogin> {
  if (typeof usuario !== "string" || typeof contrasena !== "string") {
    return { ok: false, status: 401, error: "Usuario o contraseña incorrectos" };
  }

  // El usuario no es sensible a mayúsculas/espacios (evita fallos por
  // autocapitalización del teclado en celular); la contraseña sí.
  const usuarioNorm = usuario.trim().toLowerCase();
  // El bloqueo por intentos fallidos es por usuario + IP: así alguien de
  // fuera no puede dejar bloqueada a la doctora equivocándose a propósito
  // con su usuario (la doctora entra desde otra IP sin problema).
  const claveBloqueo = `${usuarioNorm}|${ipDe(req)}`.slice(0, 160);

  // Si ya se agotaron los intentos ni siquiera se verifica la contraseña.
  const bloqueoRestante = await minutosDeBloqueo(claveBloqueo);
  if (bloqueoRestante != null) {
    return {
      ok: false,
      status: 429,
      error: `Demasiados intentos fallidos. Espera ${bloqueoRestante} minuto${bloqueoRestante === 1 ? "" : "s"} e inténtalo de nuevo.`,
    };
  }

  let identidad: IdentidadSesion | null = null;

  // Cuenta admin original por variables de entorno (sin fila en `usuarios`).
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
      if (necesitaRehash(rows[0].contrasena_hash)) {
        await query(`UPDATE usuarios SET contrasena_hash = $2 WHERE id = $1`, [rows[0].id, await hashContrasena(contrasena)]);
      }
    }
  }

  if (!identidad) {
    await registrarIntentoFallido(claveBloqueo);
    return { ok: false, status: 401, error: "Usuario o contraseña incorrectos" };
  }

  // Verificación en dos pasos: si la cuenta la tiene activa, la contraseña
  // sola no basta — se pide el código de 6 dígitos.
  const { secreto } = await leerTotp(identidad.usuarioId);
  if (secreto) {
    const cod = typeof codigo === "string" ? codigo : "";
    if (!cod) return { ok: false, status: 401, requiereCodigo: true, error: "Escribe el código de tu app de autenticación" };
    if (!verificarCodigoTotp(secreto, cod)) {
      await registrarIntentoFallido(claveBloqueo);
      return { ok: false, status: 401, requiereCodigo: true, error: "Código incorrecto" };
    }
  }

  await registrarIntentoExitoso(claveBloqueo);
  return { ok: true, identidad };
}

export async function ponerCookieSesion(res: NextResponse, identidad: IdentidadSesion) {
  res.cookies.set(COOKIE_SESION, await crearSesionToken(identidad), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESION_MAX_AGE_SEGUNDOS,
  });
}
