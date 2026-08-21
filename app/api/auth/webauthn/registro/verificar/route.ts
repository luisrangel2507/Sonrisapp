import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { guardarPasskey } from "@/lib/webauthn-store";
import { WEBAUTHN_COOKIE } from "@/lib/webauthn-cookie";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const credencial = body?.credencial;
    const nombreDispositivo = typeof body?.nombreDispositivo === "string" ? body.nombreDispositivo.trim() : "";

    const challenge = req.cookies.get(WEBAUTHN_COOKIE)?.value;
    if (!challenge || !credencial) {
      return NextResponse.json({ error: "La solicitud expiró, intenta de nuevo." }, { status: 400 });
    }

    const verificacion = await verifyRegistrationResponse({
      response: credencial,
      expectedChallenge: challenge,
      expectedOrigin: req.nextUrl.origin,
      expectedRPID: req.nextUrl.hostname,
    });

    if (!verificacion.verified || !verificacion.registrationInfo) {
      return NextResponse.json({ error: "No se pudo verificar Face ID." }, { status: 400 });
    }

    const { credential } = verificacion.registrationInfo;
    await guardarPasskey(
      nombreDispositivo || "Dispositivo sin nombre",
      credential.id,
      isoBase64URL.fromBuffer(credential.publicKey)
    );

    const res = NextResponse.json({ ok: true });
    res.cookies.delete(WEBAUTHN_COOKIE);
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo activar Face ID." },
      { status: 400 }
    );
  }
}
