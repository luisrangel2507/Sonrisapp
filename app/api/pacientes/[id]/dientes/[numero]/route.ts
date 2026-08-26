import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ESTADO_DIENTE, type EstadoDiente } from "@/lib/dental";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";
import { cifrar, descifrar } from "@/lib/crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; numero: string } }
) {
  try {
    const pacienteId = Number(params.id);
    const numeroFdi = Number(params.numero);

    if (!Number.isInteger(pacienteId) || numeroFdi < 11 || numeroFdi > 48) {
      return NextResponse.json({ error: "parámetros inválidos" }, { status: 400 });
    }

    const body = await req.json();
    const { tipo, nota, estado } = body ?? {};

    if (!tipo || typeof tipo !== "string") {
      return NextResponse.json({ error: "tipo es requerido" }, { status: 400 });
    }

    if (estado && !(estado in ESTADO_DIENTE)) {
      return NextResponse.json({ error: "estado inválido" }, { status: 400 });
    }

    const nuevoEstado: EstadoDiente | undefined = estado;
    const identidad = await identidadDesdeRequest(req);

    const { rows: dienteRows } = await query<{ id: number }>(
      `INSERT INTO paciente_dientes (paciente_id, numero_fdi, estado)
       VALUES ($1, $2, COALESCE($3, 'sano'))
       ON CONFLICT (paciente_id, numero_fdi)
       DO UPDATE SET estado = COALESCE($3, paciente_dientes.estado)
       RETURNING id`,
      [pacienteId, numeroFdi, nuevoEstado ?? null]
    );

    const dienteId = dienteRows[0].id;

    const { rows: entradaRows } = await query(
      `INSERT INTO diente_historial (paciente_diente_id, tipo, nota, creado_por, creado_por_nombre)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, fecha, tipo, nota`,
      [dienteId, tipo, cifrar(nota ?? null), identidad.usuarioId, identidad.nombre]
    );

    const entrada = { ...entradaRows[0], nota: descifrar(entradaRows[0].nota) };

    return NextResponse.json({ entrada }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
