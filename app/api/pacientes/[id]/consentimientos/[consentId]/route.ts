import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";

// "Eliminar" no borra (NOM-024: un consentimiento firmado es evidencia
// legal) — marca el documento vigente=false con el motivo y quién lo
// anuló. Sigue existiendo en la base para auditoría.
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string; consentId: string }> }
) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    const consentId = Number(params.consentId);
    if (!Number.isInteger(pacienteId) || !Number.isInteger(consentId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";
    if (!motivo) {
      return NextResponse.json({ error: "motivo es requerido" }, { status: 400 });
    }

    const identidad = await identidadDesdeRequest(req);

    const { rows } = await query<{ id: number }>(
      `UPDATE consentimientos
       SET vigente = false, motivo_anulacion = $1, anulado_por_nombre = $2, anulado_en = now()
       WHERE id = $3 AND paciente_id = $4 AND vigente = true
       RETURNING id`,
      [motivo, identidad.nombre, consentId, pacienteId]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "consentimiento no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
