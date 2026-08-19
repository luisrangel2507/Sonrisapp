import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const COLUMNAS = `id, nombre, cantidad::float8 AS cantidad, unidad, cantidad_minima::float8 AS cantidad_minima, notas, actualizado_en`;

export async function GET() {
  try {
    const { rows } = await query(`SELECT ${COLUMNAS} FROM inventario ORDER BY nombre ASC`);
    return NextResponse.json({ inventario: rows });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, cantidad, unidad, cantidad_minima, notas } = body ?? {};

    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return NextResponse.json({ error: "nombre es requerido" }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO inventario (nombre, cantidad, unidad, cantidad_minima, notas)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLUMNAS}`,
      [
        nombre.trim(),
        cantidad != null && cantidad !== "" ? Number(cantidad) : 0,
        unidad || null,
        cantidad_minima != null && cantidad_minima !== "" ? Number(cantidad_minima) : null,
        notas || null,
      ]
    );

    return NextResponse.json({ item: rows[0] }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
