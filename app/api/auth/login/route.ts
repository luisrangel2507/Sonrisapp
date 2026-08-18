import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, SESION_MAX_AGE_SEGUNDOS, compararSeguro, crearSesionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const usuarioValido = process.env.APP_LOGIN_USER;
  const passValido = process.env.APP_LOGIN_PASSWORD;

  if (!usuarioValido || !passValido) {
    return NextResponse.json(
      { error: "El login no está configurado en el servidor (faltan APP_LOGIN_USER/APP_LOGIN_PASSWORD)" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const usuario = body?.usuario;
  const contrasena = body?.contrasena;

  // El usuario no es sensible a mayúsculas/espacios (evita fallos por
  // autocapitalización del teclado en celular); la contraseña sí.
  const ok =
    typeof usuario === "string" &&
    typeof contrasena === "string" &&
    compararSeguro(usuario.trim().toLowerCase(), usuarioValido.trim().toLowerCase()) &&
    compararSeguro(contrasena, passValido);

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
