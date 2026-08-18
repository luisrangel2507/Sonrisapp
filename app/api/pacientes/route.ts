import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { generarFolio } from "@/lib/folio";

export async function GET() {
  const { rows } = await query(
    `SELECT id, nombre, telefono, email, folio, puntos, meta_premio, premio_actual,
            fecha_nacimiento, visitas_totales, creado_en
     FROM pacientes ORDER BY id DESC`
  );
  return NextResponse.json({ pacientes: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, telefono, email, fecha_nacimiento } = body ?? {};

  if (!nombre || typeof nombre !== "string") {
    return NextResponse.json({ error: "nombre es requerido" }, { status: 400 });
  }

  const folio = await generarFolio();

  const { rows } = await query(
    `INSERT INTO pacientes (nombre, telefono, email, fecha_nacimiento, folio)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nombre, telefono, email, folio, puntos, meta_premio, premio_actual,
               fecha_nacimiento, visitas_totales, creado_en`,
    [nombre, telefono ?? null, email ?? null, fecha_nacimiento ?? null, folio]
  );

  const paciente = rows[0];

  // Inicializa los 32 dientes en estado 'sano' para el odontograma.
  const { NUMEROS_FDI } = await import("@/lib/dental");
  await query(
    `INSERT INTO paciente_dientes (paciente_id, numero_fdi, estado)
     SELECT $1, unnest($2::int[]), 'sano'
     ON CONFLICT (paciente_id, numero_fdi) DO NOTHING`,
    [paciente.id, NUMEROS_FDI]
  );

  return NextResponse.json({ paciente }, { status: 201 });
}
