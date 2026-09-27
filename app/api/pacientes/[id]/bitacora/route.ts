import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

// Últimos accesos al expediente de este paciente (NOM-024: trazabilidad
// de lectura) — quién lo consultó (o "null" si fue el propio paciente
// con su link público) y cuándo.
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows } = await query(
      `SELECT id, tipo, usuario_nombre, creado_en FROM bitacora_accesos
       WHERE paciente_id = $1 ORDER BY creado_en DESC LIMIT 30`,
      [pacienteId]
    );

    return NextResponse.json({ accesos: rows });
  } catch (err) {
    return errorJson(err);
  }
}
