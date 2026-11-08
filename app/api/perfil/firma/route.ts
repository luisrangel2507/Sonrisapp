import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { cifrar } from "@/lib/crypto";
import { identidadDesdeRequest } from "@/lib/auth";
import { obtenerFirmaDoctora } from "@/lib/firma-doctora";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ firma: await obtenerFirmaDoctora() });
  } catch (err) {
    return errorJson(err);
  }
}

// Guarda (o borra con firma: null) la firma de la doctora. Solo admin.
export async function PUT(req: NextRequest) {
  try {
    const identidad = await identidadDesdeRequest(req);
    if (identidad.rol !== "admin") return NextResponse.json({ error: "solo administradores" }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const firma = body?.firma ?? null;
    if (firma !== null && (typeof firma !== "string" || !firma.startsWith("data:image/png") || firma.length > 500_000)) {
      return NextResponse.json({ error: "firma inválida" }, { status: 400 });
    }
    await query(
      `INSERT INTO perfil_dentista (id, firma_doctora, actualizado_en) VALUES (1, $1, now())
       ON CONFLICT (id) DO UPDATE SET firma_doctora = $1, actualizado_en = now()`,
      [firma ? cifrar(firma) : null]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
