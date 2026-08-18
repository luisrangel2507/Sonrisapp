import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const { rows } = await query(
    `SELECT id, nombre, telefono, email, folio, puntos, meta_premio, premio_actual,
            fecha_nacimiento, visitas_totales, creado_en
     FROM pacientes WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ paciente: rows[0] });
}
