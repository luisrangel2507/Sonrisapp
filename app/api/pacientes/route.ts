import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { generarFolio } from "@/lib/folio";
import { generarHistorialToken } from "@/lib/historial-token";
import { PACIENTE_COLUMNAS } from "@/lib/paciente-columns";
import { errorJson } from "@/lib/api-error";
import { esFechaFutura } from "@/lib/fechas";
import { descifrar } from "@/lib/crypto";

// Igual que en pacientes/[id]: se busca por nombre/folio/teléfono en
// texto plano (no están cifrados, para no romper la búsqueda), pero el
// contenido clínico de texto libre sí viene cifrado y se descifra aquí.
const CAMPOS_CIFRABLES = ["alergias_cual", "medicamentos", "antecedentes_medicos_cual"] as const;

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();

    const { rows } = q
      ? await query(
          `SELECT ${PACIENTE_COLUMNAS} FROM pacientes
           WHERE nombre ILIKE $1 OR folio ILIKE $1 OR telefono ILIKE $1
           ORDER BY id DESC`,
          [`%${q}%`]
        )
      : await query(`SELECT ${PACIENTE_COLUMNAS} FROM pacientes ORDER BY id DESC`);

    const pacientes = rows.map((fila) => {
      const copia = { ...fila };
      for (const campo of CAMPOS_CIFRABLES) copia[campo] = descifrar(copia[campo]);
      return copia;
    });

    return NextResponse.json({ pacientes });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, telefono, email, fecha_nacimiento } = body ?? {};

    if (!nombre || typeof nombre !== "string") {
      return NextResponse.json({ error: "nombre es requerido" }, { status: 400 });
    }
    if (fecha_nacimiento && esFechaFutura(fecha_nacimiento)) {
      return NextResponse.json({ error: "la fecha de nacimiento no puede ser futura" }, { status: 400 });
    }

    const folio = await generarFolio();
    const historialToken = generarHistorialToken();

    const { rows } = await query(
      `INSERT INTO pacientes (nombre, telefono, email, fecha_nacimiento, folio, historial_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${PACIENTE_COLUMNAS}`,
      [nombre, telefono ?? null, email ?? null, fecha_nacimiento ?? null, folio, historialToken]
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
  } catch (err) {
    return errorJson(err);
  }
}
