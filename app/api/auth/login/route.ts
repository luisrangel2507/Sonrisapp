import { NextRequest, NextResponse } from "next/server";
import { limitarPublico } from "@/lib/limite-publico";
import { autenticar, ponerCookieSesion } from "@/lib/autenticar";

export async function POST(req: NextRequest) {
  const limitado = await limitarPublico(req, "login", 30, 15, 10_000);
  if (limitado) return limitado;
  const body = await req.json().catch(() => null);

  const r = await autenticar(req, body?.usuario, body?.contrasena, body?.codigo);
  if (!r.ok) {
    return NextResponse.json(r.requiereCodigo ? { requiereCodigo: true, error: r.error } : { error: r.error }, { status: r.status });
  }

  const res = NextResponse.json({ ok: true });
  await ponerCookieSesion(res, r.identidad);
  return res;
}
