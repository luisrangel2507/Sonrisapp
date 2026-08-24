import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; numero: string; entradaId: string } }
) {
  try {
    const pacienteId = Number(params.id);
    const numeroFdi = Number(params.numero);
    const entradaId = Number(params.entradaId);

    if (!Number.isInteger(pacienteId) || numeroFdi < 11 || numeroFdi > 48 || !Number.isInteger(entradaId)) {
      return NextResponse.json({ error: "parámetros inválidos" }, { status: 400 });
    }

    const body = await req.json();
    const { tipo, nota } = body ?? {};

    if (!tipo || typeof tipo !== "string") {
      return NextResponse.json({ error: "tipo es requerido" }, { status: 400 });
    }

    const { rows } = await query(
      `UPDATE diente_historial h
       SET tipo = $1, nota = $2
       FROM paciente_dientes d
       WHERE h.id = $3
         AND h.paciente_diente_id = d.id
         AND d.paciente_id = $4
         AND d.numero_fdi = $5
       RETURNING h.id, h.fecha, h.tipo, h.nota`,
      [tipo, nota ?? null, entradaId, pacienteId, numeroFdi]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "registro no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ entrada: rows[0] });
  } catch (err) {
    return errorJson(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; numero: string; entradaId: string } }
) {
  try {
    const pacienteId = Number(params.id);
    const numeroFdi = Number(params.numero);
    const entradaId = Number(params.entradaId);

    if (!Number.isInteger(pacienteId) || numeroFdi < 11 || numeroFdi > 48 || !Number.isInteger(entradaId)) {
      return NextResponse.json({ error: "parámetros inválidos" }, { status: 400 });
    }

    const { rows } = await query<{ id: number }>(
      `DELETE FROM diente_historial h
       USING paciente_dientes d
       WHERE h.id = $1
         AND h.paciente_diente_id = d.id
         AND d.paciente_id = $2
         AND d.numero_fdi = $3
       RETURNING h.id`,
      [entradaId, pacienteId, numeroFdi]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "registro no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    return errorJson(err);
  }
}
