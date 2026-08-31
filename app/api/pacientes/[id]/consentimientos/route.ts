import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { generarHistorialToken } from "@/lib/historial-token";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows } = await query(
      `SELECT id, paciente_id, titulo, contenido, token, estado, firma, nombre_firma, firmado_en, creado_en
       FROM consentimientos WHERE paciente_id = $1 ORDER BY creado_en DESC`,
      [pacienteId]
    );

    return NextResponse.json({ consentimientos: rows });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { titulo, contenido } = body ?? {};

    if (!titulo || typeof titulo !== "string") {
      return NextResponse.json({ error: "título es requerido" }, { status: 400 });
    }
    if (!contenido || typeof contenido !== "string") {
      return NextResponse.json({ error: "contenido es requerido" }, { status: 400 });
    }

    const token = generarHistorialToken();

    const { rows } = await query(
      `INSERT INTO consentimientos (paciente_id, titulo, contenido, token)
       VALUES ($1, $2, $3, $4)
       RETURNING id, paciente_id, titulo, contenido, token, estado, firma, nombre_firma, firmado_en, creado_en`,
      [pacienteId, titulo, contenido, token]
    );

    return NextResponse.json({ consentimiento: rows[0] }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
