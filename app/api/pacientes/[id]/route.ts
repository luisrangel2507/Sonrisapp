import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { PACIENTE_COLUMNAS } from "@/lib/paciente-columns";
import { errorJson } from "@/lib/api-error";
import { esFechaFutura } from "@/lib/fechas";
import { cifrar, descifrar } from "@/lib/crypto";

// Texto libre clínico de la ficha rápida del paciente — se cifra en
// reposo (NOM-024) igual que la historia clínica y el formulario público.
const CAMPOS_CIFRABLES = new Set(["alergias_cual", "medicamentos", "antecedentes_medicos_cual"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows } = await query(
      `SELECT ${PACIENTE_COLUMNAS} FROM pacientes WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }

    const paciente = { ...rows[0] };
    for (const campo of Array.from(CAMPOS_CIFRABLES)) {
      if (campo in paciente) paciente[campo] = descifrar(paciente[campo]);
    }

    return NextResponse.json({ paciente });
  } catch (err) {
    return errorJson(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rowCount } = await query(`DELETE FROM pacientes WHERE id = $1`, [id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}

const CAMPOS_EDITABLES = [
  "nombre",
  "telefono",
  "email",
  "fecha_nacimiento",
  "alergias",
  "alergias_cual",
  "medicamentos",
  "antecedentes_medicos",
  "antecedentes_medicos_cual",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const actualizaciones = CAMPOS_EDITABLES.filter((campo) => campo in (body ?? {}));

    if (actualizaciones.length === 0) {
      return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
    }
    if (body.fecha_nacimiento && esFechaFutura(body.fecha_nacimiento)) {
      return NextResponse.json({ error: "la fecha de nacimiento no puede ser futura" }, { status: 400 });
    }

    const asignaciones = actualizaciones.map((campo, i) => `${campo} = $${i + 2}`).join(", ");
    const valores = actualizaciones.map((campo) => {
      const valor = body[campo] ?? null;
      return CAMPOS_CIFRABLES.has(campo) ? cifrar(valor) : valor;
    });

    const { rows } = await query(
      `UPDATE pacientes SET ${asignaciones} WHERE id = $1 RETURNING ${PACIENTE_COLUMNAS}`,
      [id, ...valores]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }

    const paciente = { ...rows[0] };
    for (const campo of Array.from(CAMPOS_CIFRABLES)) {
      if (campo in paciente) paciente[campo] = descifrar(paciente[campo]);
    }

    return NextResponse.json({ paciente });
  } catch (err) {
    return errorJson(err);
  }
}
