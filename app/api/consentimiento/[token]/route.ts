import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

// Ruta pública (fuera del middleware de sesión): el paciente entra con
// el link que le comparte la clínica y firma sin necesitar cuenta.
export const dynamic = "force-dynamic";

const FIRMA_MAX_BYTES = 500_000;

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { rows } = await query(
      `SELECT c.id, c.titulo, c.contenido, c.estado, c.firma, c.nombre_firma, c.firmado_en,
              p.nombre AS paciente_nombre
       FROM consentimientos c
       JOIN pacientes p ON p.id = c.paciente_id
       WHERE c.token = $1`,
      [params.token]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }

    return NextResponse.json({ consentimiento: rows[0] });
  } catch (err) {
    return errorJson(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const { nombre_firma, firma } = body ?? {};

    if (!nombre_firma || typeof nombre_firma !== "string") {
      return NextResponse.json({ error: "nombre_firma es requerido" }, { status: 400 });
    }
    if (!firma || typeof firma !== "string" || !firma.startsWith("data:image/")) {
      return NextResponse.json({ error: "firma inválida" }, { status: 400 });
    }
    if (firma.length > FIRMA_MAX_BYTES) {
      return NextResponse.json({ error: "la firma es demasiado grande" }, { status: 400 });
    }

    const { rows: existentes } = await query<{ id: number; estado: string }>(
      `SELECT id, estado FROM consentimientos WHERE token = $1`,
      [params.token]
    );
    if (existentes.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }
    if (existentes[0].estado === "firmado") {
      return NextResponse.json({ error: "este consentimiento ya fue firmado" }, { status: 409 });
    }

    const { rows } = await query(
      `UPDATE consentimientos
       SET estado = 'firmado', firma = $2, nombre_firma = $3, firmado_en = now()
       WHERE token = $1
       RETURNING id, titulo, contenido, estado, firma, nombre_firma, firmado_en`,
      [params.token, firma, nombre_firma]
    );

    return NextResponse.json({ consentimiento: rows[0] });
  } catch (err) {
    return errorJson(err);
  }
}
