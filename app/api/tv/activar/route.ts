import { NextRequest, NextResponse } from "next/server";
import { COOKIE_TV, TV_MAX_AGE_SEGUNDOS, verificarTokenTv } from "@/lib/auth";
import { versionTv } from "@/lib/tv";
import { limitarPublico } from "@/lib/limite-publico";
import { errorJson } from "@/lib/api-error";

// Canjea la clave del link de vinculación por la cookie de TV.
export async function POST(req: NextRequest) {
  const limitado = await limitarPublico(req, "tv-activar", 10, 15, 5_000);
  if (limitado) return limitado;
  try {
    const body = await req.json().catch(() => ({}));
    const clave = typeof body?.clave === "string" ? body.clave : "";
    const tv = await verificarTokenTv(clave);
    if (!tv || tv.v !== (await versionTv())) {
      return NextResponse.json({ error: "Esta clave ya no es válida. Genera un link nuevo." }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_TV, clave, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TV_MAX_AGE_SEGUNDOS,
    });
    return res;
  } catch (err) {
    return errorJson(err);
  }
}
