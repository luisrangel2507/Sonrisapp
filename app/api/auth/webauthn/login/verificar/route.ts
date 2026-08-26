import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { obtenerPasskeyPorCredentialId, actualizarContadorPasskey } from "@/lib/webauthn-store";
import { WEBAUTHN_COOKIE } from "@/lib/webauthn-cookie";
import { obtenerRpIdYOrigin } from "@/lib/webauthn-origin";
import { COOKIE_SESION, SESION_MAX_AGE_SEGUNDOS, crearSesionToken } from "@/lib/auth";
import { DOCTORA } from "@/lib/panel-data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const credencial = body?.credencial;

    const challenge = req.cookies.get(WEBAUTHN_COOKIE)?.value;
    if (!challenge || !credencial?.id) {
      return NextResponse.json({ error: "La solicitud expiró, intenta de nuevo." }, { status: 400 });
    }

    const passkey = await obtenerPasskeyPorCredentialId(credencial.id);
    if (!passkey) {
      return NextResponse.json({ error: "Face ID no reconocido en este dispositivo." }, { status: 401 });
    }

    const { rpID, origin } = obtenerRpIdYOrigin(req);
    const verificacion = await verifyAuthenticationResponse({
      response: credencial,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credential_id,
        publicKey: isoBase64URL.toBuffer(passkey.public_key),
        counter: passkey.contador,
      },
    });

    if (!verificacion.verified) {
      return NextResponse.json({ error: "No se pudo verificar Face ID." }, { status: 401 });
    }

    await actualizarContadorPasskey(passkey.id, verificacion.authenticationInfo.newCounter);

    // Face ID no está ligado a una fila de `usuarios` (es la sesión
    // compartida del consultorio) — se registra con el nombre del
    // dispositivo para poder rastrear cuál celular la usó.
    const token = await crearSesionToken({
      usuarioId: null,
      nombre: `${DOCTORA.nombre} · Face ID (${passkey.nombre_dispositivo})`,
      rol: "admin",
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_SESION, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESION_MAX_AGE_SEGUNDOS,
    });
    res.cookies.delete(WEBAUTHN_COOKIE);
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo verificar Face ID." },
      { status: 401 }
    );
  }
}
