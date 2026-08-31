import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { generarHistorialToken } from "@/lib/historial-token";
import { generarConsentimientoExpediente } from "@/lib/consentimiento-expediente";

// Genera automáticamente el consentimiento de expediente clínico
// electrónico, ya redactado y con los datos del paciente llenados —
// la doctora no escribe nada, solo lo comparte para firma.
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows: pacienteRows } = await query<{
      nombre: string;
      folio: string | null;
      fecha_nacimiento: string | null;
    }>(`SELECT nombre, folio, fecha_nacimiento FROM pacientes WHERE id = $1`, [pacienteId]);

    if (pacienteRows.length === 0) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }

    const { titulo, contenido } = generarConsentimientoExpediente(pacienteRows[0]);
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
