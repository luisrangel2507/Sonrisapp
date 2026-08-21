import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { WEBAUTHN_COOKIE, WEBAUTHN_COOKIE_MAX_AGE } from "@/lib/webauthn-cookie";
import { obtenerRpIdYOrigin } from "@/lib/webauthn-origin";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Sin allowCredentials el teléfono ofrece cualquier passkey guardada
// para este sitio (login "sin usuario") — pero Safari entonces
// muestra primero un selector de cuenta antes de pedir Face ID. Si el
// navegador ya recuerda con qué credencial entró la última vez
// (guardada en localStorage), se la pasamos como único candidato para
// que salte directo al Face ID sin ese paso extra.
export async function GET(req: NextRequest) {
  try {
    const { rpID } = obtenerRpIdYOrigin(req);
    const credId = req.nextUrl.searchParams.get("credId");
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      ...(credId ? { allowCredentials: [{ id: credId }] } : {}),
    });

    const res = NextResponse.json(options);
    res.cookies.set(WEBAUTHN_COOKIE, options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: WEBAUTHN_COOKIE_MAX_AGE,
    });
    return res;
  } catch (err) {
    return errorJson(err);
  }
}
