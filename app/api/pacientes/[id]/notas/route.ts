import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

// Límite generoso para el archivo ya comprimido/codificado en el
// cliente (data URL base64) — evita que alguien mande algo enorme.
const ARCHIVO_MAX_BYTES = 6_000_000;
const ARCHIVO_PREFIJOS = ["data:image/", "data:application/pdf"];

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
      `SELECT id, fecha, tipo, nota, archivo, archivo_nombre, archivo_tipo FROM paciente_notas
       WHERE paciente_id = $1 ORDER BY fecha DESC, id DESC`,
      [pacienteId]
    );

    return NextResponse.json({ notas: rows });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { tipo, nota, creado_por, archivo, archivo_nombre, archivo_tipo } = body ?? {};

    if (!tipo || typeof tipo !== "string") {
      return NextResponse.json({ error: "tipo es requerido" }, { status: 400 });
    }

    if (archivo != null) {
      if (typeof archivo !== "string" || !ARCHIVO_PREFIJOS.some((p) => archivo.startsWith(p))) {
        return NextResponse.json({ error: "archivo inválido" }, { status: 400 });
      }
      if (archivo.length > ARCHIVO_MAX_BYTES) {
        return NextResponse.json({ error: "el archivo es demasiado grande" }, { status: 400 });
      }
    }

    const { rows } = await query(
      `INSERT INTO paciente_notas (paciente_id, tipo, nota, creado_por, archivo, archivo_nombre, archivo_tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, fecha, tipo, nota, archivo, archivo_nombre, archivo_tipo`,
      [
        pacienteId,
        tipo,
        nota ?? null,
        creado_por ?? null,
        archivo ?? null,
        archivo_nombre ?? null,
        archivo_tipo ?? null,
      ]
    );

    return NextResponse.json({ nota: rows[0] }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
