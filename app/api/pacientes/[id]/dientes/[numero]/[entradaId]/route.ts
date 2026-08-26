import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";

// "Editar" no sobrescribe el registro original (NOM-024: nada se borra
// ni se altera de verdad) — inserta una fila nueva con la corrección,
// ligada a la anterior por reemplaza_a, y marca la vieja vigente=false.
// Las dos quedan visibles: la app solo usa la vigente como "el dato
// actual".
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

    const identidad = await identidadDesdeRequest(req);

    const { rows: originalRows } = await query<{ id: number; paciente_diente_id: number }>(
      `SELECT h.id, h.paciente_diente_id
       FROM diente_historial h
       JOIN paciente_dientes d ON d.id = h.paciente_diente_id
       WHERE h.id = $1 AND d.paciente_id = $2 AND d.numero_fdi = $3 AND h.vigente = true`,
      [entradaId, pacienteId, numeroFdi]
    );

    if (originalRows.length === 0) {
      return NextResponse.json({ error: "registro no encontrado" }, { status: 404 });
    }
    const dienteId = originalRows[0].paciente_diente_id;

    const { rows: nuevaRows } = await query(
      `INSERT INTO diente_historial (paciente_diente_id, tipo, nota, creado_por, creado_por_nombre, reemplaza_a)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, fecha, tipo, nota`,
      [dienteId, tipo, nota ?? null, identidad.usuarioId, identidad.nombre, entradaId]
    );

    await query(`UPDATE diente_historial SET vigente = false WHERE id = $1`, [entradaId]);

    return NextResponse.json({ entrada: nuevaRows[0] });
  } catch (err) {
    return errorJson(err);
  }
}

// "Eliminar" tampoco borra — marca el registro vigente=false con el
// motivo y quién lo anuló, y se sigue mostrando (marcado) en el
// historial.
export async function DELETE(
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

    const body = await req.json().catch(() => ({}));
    const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";
    if (!motivo) {
      return NextResponse.json({ error: "motivo es requerido" }, { status: 400 });
    }

    const identidad = await identidadDesdeRequest(req);

    const { rows } = await query<{ id: number }>(
      `UPDATE diente_historial h
       SET vigente = false, motivo_anulacion = $1, anulado_por_nombre = $2, anulado_en = now()
       FROM paciente_dientes d
       WHERE h.id = $3
         AND h.paciente_diente_id = d.id
         AND d.paciente_id = $4
         AND d.numero_fdi = $5
         AND h.vigente = true
       RETURNING h.id`,
      [motivo, identidad.nombre, entradaId, pacienteId, numeroFdi]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "registro no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    return errorJson(err);
  }
}
