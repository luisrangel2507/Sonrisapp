import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";
import { cifrar } from "@/lib/crypto";

// Marca una solicitud ARCO como resuelta — no se borra (queda el
// registro de qué pidió el paciente y cómo se resolvió).
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string; solicitudId: string }> }
) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    const solicitudId = Number(params.solicitudId);
    if (!Number.isInteger(pacienteId) || !Number.isInteger(solicitudId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const respuesta = typeof body?.respuesta === "string" ? body.respuesta.trim() : "";

    const identidad = await identidadDesdeRequest(req);

    const { rows } = await query<{ id: number }>(
      `UPDATE solicitudes_paciente
       SET estado = 'resuelta', respuesta = $1, resuelta_por_nombre = $2, resuelta_en = now()
       WHERE id = $3 AND paciente_id = $4 AND estado = 'pendiente'
       RETURNING id`,
      [respuesta ? cifrar(respuesta) : null, identidad.nombre, solicitudId, pacienteId]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "solicitud no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
