import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";
import { CHECKLIST_SANITARIO } from "@/lib/checklist-sanitario";

export const dynamic = "force-dynamic";

const CLAVES = new Set(CHECKLIST_SANITARIO.flatMap((g) => g.items.map(([c]) => c)));

// Estado del checklist sanitario del consultorio (protegido por proxy.ts).
export async function GET() {
  try {
    const { rows } = await query(`SELECT clave, cumplido, nota, actualizado_por, actualizado_en FROM checklist_sanitario`);
    return NextResponse.json({ estado: rows });
  } catch (err) {
    return errorJson(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const clave = String(body?.clave ?? "");
    if (!CLAVES.has(clave)) return NextResponse.json({ error: "requisito inválido" }, { status: 400 });
    const cumplido = body?.cumplido === true;
    const nota = typeof body?.nota === "string" && body.nota.trim() ? body.nota.trim().slice(0, 300) : null;
    const identidad = await identidadDesdeRequest(req);
    await query(
      `INSERT INTO checklist_sanitario (clave, cumplido, nota, actualizado_por, actualizado_en)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (clave) DO UPDATE SET cumplido = $2, nota = COALESCE($3, checklist_sanitario.nota),
         actualizado_por = $4, actualizado_en = now()`,
      [clave, cumplido, nota, identidad.nombre]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
