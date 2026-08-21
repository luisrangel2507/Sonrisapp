import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { WEBAUTHN_COOKIE, WEBAUTHN_COOKIE_MAX_AGE } from "@/lib/webauthn-cookie";
import { obtenerRpIdYOrigin } from "@/lib/webauthn-origin";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Sin allowCredentials a propósito — así el teléfono ofrece cualquier
// passkey guardada para este sitio (login "sin usuario") en vez de
// necesitar saber de antemano cuál credencial usar.
export async function GET(req: NextRequest) {
  try {
    const { rpID } = obtenerRpIdYOrigin(req);
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
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
