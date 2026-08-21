import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { WEBAUTHN_COOKIE, WEBAUTHN_COOKIE_MAX_AGE } from "@/lib/webauthn-cookie";
import { obtenerRpIdYOrigin } from "@/lib/webauthn-origin";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { rpID } = obtenerRpIdYOrigin(req);
    const options = await generateRegistrationOptions({
      rpName: "Viña Sonrisas",
      rpID,
      userName: "consultorio",
      userDisplayName: "Viña Sonrisas",
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
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
