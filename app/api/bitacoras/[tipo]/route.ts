import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Bitácoras sanitarias del consultorio (protegidas por proxy.ts):
// esterilización (NOM-013, control de infecciones) y residuos
// biológico-infecciosos RPBI (NOM-087).
const CONFIG = {
  esterilizacion: {
    tabla: "bitacora_esterilizacion",
    campos: ["fecha", "ciclo", "equipo", "temperatura", "tiempo_min", "testigo_quimico", "testigo_biologico", "contenido", "nota"],
  },
  rpbi: {
    tabla: "bitacora_rpbi",
    campos: ["fecha", "tipo", "cantidad_kg", "recolector", "manifiesto", "nota"],
  },
  rayosx: {
    tabla: "bitacora_rayosx",
    campos: ["fecha", "paciente", "tipo_estudio", "exposiciones", "proteccion", "embarazo_descartado", "nota"],
  },
} as const;

type Tipo = keyof typeof CONFIG;
const valido = (t: string): t is Tipo => t in CONFIG;

export async function GET(_req: NextRequest, props: { params: Promise<{ tipo: string }> }) {
  try {
    const { tipo } = await props.params;
    if (!valido(tipo)) return NextResponse.json({ error: "bitácora inválida" }, { status: 404 });
    const { rows } = await query(
      `SELECT t.*, to_char(t.fecha, 'YYYY-MM-DD') AS fecha FROM ${CONFIG[tipo].tabla} t ORDER BY t.fecha DESC, t.id DESC LIMIT 200`
    );
    return NextResponse.json({ registros: rows });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ tipo: string }> }) {
  try {
    const { tipo } = await props.params;
    if (!valido(tipo)) return NextResponse.json({ error: "bitácora inválida" }, { status: 404 });
    const { tabla, campos } = CONFIG[tipo];
    const body = await req.json().catch(() => ({}));
    const valores = campos.map((c) => {
      const v = body?.[c];
      if (v == null || v === "") return null;
      if (c === "fecha") return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : null;
      if (c === "cantidad_kg") return Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
      return String(v).slice(0, c === "nota" || c === "contenido" ? 500 : 160);
    });
    if (tipo === "rpbi" && !valores[(campos as readonly string[]).indexOf("tipo")]) {
      return NextResponse.json({ error: "elige el tipo de residuo" }, { status: 400 });
    }
    const identidad = await identidadDesdeRequest(req);
    const cols = [...campos, "responsable"];
    const lista = cols.map((c, i) => (c === "fecha" ? `COALESCE($${i + 1}::date, CURRENT_DATE)` : `$${i + 1}`)).join(", ");
    const { rows } = await query(`INSERT INTO ${tabla} (${cols.join(", ")}) VALUES (${lista}) RETURNING id`, [
      ...valores,
      identidad.nombre,
    ]);
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
