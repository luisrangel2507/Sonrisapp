import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";

// Marca (o desmarca) un concepto del plan de tratamiento como realizado.
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string; presId: string; itemId: string }> }
) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    const presId = Number(params.presId);
    const itemId = Number(params.itemId);
    if (![pacienteId, presId, itemId].every(Number.isInteger)) {
      return NextResponse.json({ error: "parámetros inválidos" }, { status: 400 });
    }
    const body = await req.json();
    const realizado = body?.realizado === true;
    const identidad = await identidadDesdeRequest(req);
    const { rows } = await query(
      `UPDATE presupuesto_items it
       SET realizado_en = CASE WHEN $4 THEN now() ELSE NULL END,
           realizado_por_nombre = CASE WHEN $4 THEN $5 ELSE NULL END
       FROM presupuestos pr
       WHERE it.id = $3 AND it.presupuesto_id = pr.id AND pr.id = $2 AND pr.paciente_id = $1 AND pr.vigente
       RETURNING it.id, it.realizado_en, it.realizado_por_nombre`,
      [pacienteId, presId, itemId, realizado, identidad.nombre]
    );
    if (rows.length === 0) return NextResponse.json({ error: "concepto no encontrado" }, { status: 404 });
    return NextResponse.json({ item: rows[0] });
  } catch (err) {
    return errorJson(err);
  }
}
