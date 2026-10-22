import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { rows } = await query<{ nombre: string }>(
      `SELECT nombre FROM tratamientos_personalizados ORDER BY nombre`
    );
    return NextResponse.json({ tratamientos: rows.map((r) => r.nombre) });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const nombre = typeof body?.nombre === "string" ? body.nombre.trim().replace(/\s+/g, " ") : "";
    if (!nombre || nombre.length > 120) {
      return NextResponse.json({ error: "nombre inválido" }, { status: 400 });
    }
    await query(`INSERT INTO tratamientos_personalizados (nombre) VALUES ($1) ON CONFLICT DO NOTHING`, [nombre]);
    return NextResponse.json({ nombre });
  } catch (err) {
    return errorJson(err);
  }
}
