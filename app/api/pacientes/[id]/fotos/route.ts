import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";
import { cifrar, descifrar } from "@/lib/crypto";

const ETAPAS = ["antes", "durante", "despues", "otra"];
const IMAGEN_MAX = 4_000_000;
const MINIATURA_MAX = 300_000;

function esImagen(v: unknown, max: number): v is string {
  return typeof v === "string" && v.startsWith("data:image/") && v.length <= max;
}

// Lista de fotos vigentes (solo miniaturas; la imagen completa se pide
// aparte en /fotos/[fotoId]).
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
    const { rows } = await query<{ id: number; etapa: string; nota: string | null; miniatura: string; tomada_en: string }>(
      `SELECT id, etapa, nota, miniatura, tomada_en FROM paciente_fotos
       WHERE paciente_id = $1 AND vigente ORDER BY tomada_en DESC, id DESC`,
      [pacienteId]
    );
    const fotos = rows.map((f) => ({ ...f, nota: descifrar(f.nota), miniatura: descifrar(f.miniatura) }));
    return NextResponse.json({ fotos });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    if (!esImagen(body?.imagen, IMAGEN_MAX) || !esImagen(body?.miniatura, MINIATURA_MAX)) {
      return NextResponse.json({ error: "imagen inválida o demasiado grande" }, { status: 400 });
    }
    const etapa = ETAPAS.includes(body?.etapa) ? body.etapa : "otra";
    const nota = typeof body?.nota === "string" && body.nota.trim() ? body.nota.trim().slice(0, 500) : null;
    const tomada = typeof body?.tomada_en === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.tomada_en) ? body.tomada_en : null;
    const identidad = await identidadDesdeRequest(req);
    const { rows } = await query<{ id: number; etapa: string; tomada_en: string }>(
      `INSERT INTO paciente_fotos (paciente_id, etapa, nota, imagen, miniatura, tomada_en, subida_por_nombre)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7)
       RETURNING id, etapa, tomada_en`,
      [pacienteId, etapa, cifrar(nota), cifrar(body.imagen), cifrar(body.miniatura), tomada, identidad.nombre]
    );
    return NextResponse.json({ foto: { ...rows[0], nota, miniatura: body.miniatura } }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
