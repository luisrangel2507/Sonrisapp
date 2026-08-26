import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";
import { cifrar, descifrar } from "@/lib/crypto";

const CAMPOS_CIFRABLES = ["nota", "tratamiento", "duracion", "archivo"] as const;

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
      `SELECT id, fecha, tipo, nota, tratamiento, duracion, archivo, archivo_nombre, archivo_tipo,
              creado_por_nombre, vigente, motivo_anulacion, anulado_por_nombre
       FROM paciente_notas
       WHERE paciente_id = $1 ORDER BY fecha DESC, id DESC`,
      [pacienteId]
    );

    const notas = rows.map((fila) => {
      const copia = { ...fila };
      for (const campo of CAMPOS_CIFRABLES) copia[campo] = descifrar(copia[campo]);
      return copia;
    });

    return NextResponse.json({ notas });
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
    const { tipo, nota, tratamiento, duracion, archivo, archivo_nombre, archivo_tipo } = body ?? {};

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

    const identidad = await identidadDesdeRequest(req);

    const { rows } = await query(
      `INSERT INTO paciente_notas (paciente_id, tipo, nota, tratamiento, duracion, creado_por, creado_por_nombre, archivo, archivo_nombre, archivo_tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, fecha, tipo, nota, tratamiento, duracion, archivo, archivo_nombre, archivo_tipo, creado_por_nombre, vigente`,
      [
        pacienteId,
        tipo,
        cifrar(nota ?? null),
        cifrar(tratamiento ?? null),
        cifrar(duracion ?? null),
        identidad.usuarioId,
        identidad.nombre,
        cifrar(archivo ?? null),
        archivo_nombre ?? null,
        archivo_tipo ?? null,
      ]
    );

    const notaCreada = { ...rows[0] };
    for (const campo of CAMPOS_CIFRABLES) notaCreada[campo] = descifrar(notaCreada[campo]);

    return NextResponse.json({ nota: notaCreada }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
