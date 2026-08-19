import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows } = await query(
      `SELECT id, fecha, tipo, nota FROM paciente_notas
       WHERE paciente_id = $1 ORDER BY fecha DESC, id DESC`,
      [pacienteId]
    );

    return NextResponse.json({ notas: rows });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { tipo, nota, creado_por } = body ?? {};

    if (!tipo || typeof tipo !== "string") {
      return NextResponse.json({ error: "tipo es requerido" }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO paciente_notas (paciente_id, tipo, nota, creado_por)
       VALUES ($1, $2, $3, $4)
       RETURNING id, fecha, tipo, nota`,
      [pacienteId, tipo, nota ?? null, creado_por ?? null]
    );

    return NextResponse.json({ nota: rows[0] }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
