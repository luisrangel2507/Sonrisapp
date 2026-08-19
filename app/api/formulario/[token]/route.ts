import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { HISTORIA_CLINICA_CAMPOS as CAMPOS, HISTORIA_CLINICA_COLUMNAS as COLUMNAS } from "@/lib/historia-clinica-campos";

// Ruta pública (fuera del middleware de sesión): el paciente entra
// con el link que le comparte la clínica y llena su propia historia
// clínica sin necesitar cuenta.
export const dynamic = "force-dynamic";

interface PacientePublico {
  id: number;
  nombre: string;
  fecha_nacimiento: string | null;
  telefono: string | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { rows: pacienteRows } = await query<PacientePublico>(
      `SELECT id, nombre, fecha_nacimiento, telefono FROM pacientes WHERE historial_token = $1`,
      [params.token]
    );

    if (pacienteRows.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }

    const paciente = pacienteRows[0];
    const { rows: hcRows } = await query(
      `SELECT ${COLUMNAS} FROM historia_clinica WHERE paciente_id = $1`,
      [paciente.id]
    );

    return NextResponse.json({ paciente, historiaClinica: hcRows[0] ?? null });
  } catch (err) {
    return errorJson(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { rows: pacienteRows } = await query<{ id: number }>(
      `SELECT id FROM pacientes WHERE historial_token = $1`,
      [params.token]
    );

    if (pacienteRows.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }

    const pacienteId = pacienteRows[0].id;
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
