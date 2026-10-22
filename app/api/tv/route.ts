import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const MODOS = ["espera", "bienvenida", "gracias"];

export async function GET() {
  try {
    const { rows } = await query<{ modo: string; nombre: string | null; actualizado_en: string }>(
      `SELECT modo, nombre, actualizado_en FROM pantalla_tv WHERE id = 1`
    );
    return NextResponse.json(rows[0] ?? { modo: "espera", nombre: null, actualizado_en: null });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const modo = typeof body?.modo === "string" ? body.modo : "";
    if (!MODOS.includes(modo)) {
      return NextResponse.json({ error: "modo inválido" }, { status: 400 });
    }
    const nombre = typeof body?.nombre === "string" ? body.nombre.trim().slice(0, 80) : "";
    if (modo !== "espera" && !nombre) {
      return NextResponse.json({ error: "falta el nombre" }, { status: 400 });
    }
    await query(
      `INSERT INTO pantalla_tv (id, modo, nombre, actualizado_en) VALUES (1, $1, $2, now())
       ON CONFLICT (id) DO UPDATE SET modo = $1, nombre = $2, actualizado_en = now()`,
      [modo, modo === "espera" ? null : nombre]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
