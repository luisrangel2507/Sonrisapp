import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { HISTORIA_CLINICA_CAMPOS as CAMPOS, HISTORIA_CLINICA_COLUMNAS as COLUMNAS } from "@/lib/historia-clinica-campos";

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
      `SELECT ${COLUMNAS} FROM historia_clinica WHERE paciente_id = $1`,
      [pacienteId]
    );

    return NextResponse.json({ historiaClinica: rows[0] ?? null });
  } catch (err) {
    return errorJson(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    const valores = CAMPOS.map((campo) => body[campo] ?? null);
    const placeholders = CAMPOS.map((_, i) => `$${i + 2}`).join(", ");
    const actualizaciones = CAMPOS.map((campo, i) => `${campo} = $${i + 2}`).join(", ");

    const { rows } = await query(
      `INSERT INTO historia_clinica (paciente_id, ${CAMPOS.join(", ")})
       VALUES ($1, ${placeholders})
       ON CONFLICT (paciente_id) DO UPDATE SET ${actualizaciones}, actualizado_en = now()
       RETURNING ${COLUMNAS}`,
      [pacienteId, ...valores]
    );

    return NextResponse.json({ historiaClinica: rows[0] });
  } catch (err) {
    return errorJson(err);
  }
}
