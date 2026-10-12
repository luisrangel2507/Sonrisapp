import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";
import { cifrar, descifrar } from "@/lib/crypto";

const TAMANO_MAXIMO = 1_000_000;

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });

    const { rows } = await query<{ datos: string; creado_por_nombre: string | null; creado_en: string }>(
      `SELECT datos, creado_por_nombre, creado_en FROM odontograma_dibujos
       WHERE paciente_id = $1 ORDER BY id DESC LIMIT 1`,
      [pacienteId]
    );
    if (!rows[0]) return NextResponse.json({ elementos: [] });

    const texto = descifrar(rows[0].datos);
    let elementos: unknown = [];
    try {
      elementos = texto ? JSON.parse(texto) : [];
    } catch {
      elementos = [];
    }
    return NextResponse.json({
      elementos: Array.isArray(elementos) ? elementos : [],
      actualizado_por: rows[0].creado_por_nombre,
      actualizado_en: rows[0].creado_en,
    });
  } catch (err) {
    return errorJson(err);
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.elementos)) {
      return NextResponse.json({ error: "elementos inválidos" }, { status: 400 });
    }
    const json = JSON.stringify(body.elementos);
    if (json.length > TAMANO_MAXIMO) {
      return NextResponse.json({ error: "el dibujo es demasiado grande" }, { status: 413 });
    }

    const identidad = await identidadDesdeRequest(req);
    const { rows } = await query<{ creado_en: string }>(
      `INSERT INTO odontograma_dibujos (paciente_id, datos, creado_por_nombre)
       VALUES ($1, $2, $3) RETURNING creado_en`,
      [pacienteId, cifrar(json), identidad.nombre]
    );
    return NextResponse.json({ ok: true, actualizado_en: rows[0].creado_en, actualizado_por: identidad.nombre });
  } catch (err) {
    return errorJson(err);
  }
}
