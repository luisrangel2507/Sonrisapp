import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { TRATAMIENTOS } from "@/lib/panel-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { rows } = await query<{ servicio: string; precio: number | null }>(
      `SELECT servicio, precio::float8 AS precio FROM precios_servicios`
    );
    const mapa = Object.fromEntries(rows.map((r) => [r.servicio, r.precio]));
    const precios = TRATAMIENTOS.map((servicio) => ({
      servicio,
      precio: mapa[servicio] ?? null,
    }));
    return NextResponse.json({ precios });
  } catch (err) {
    return errorJson(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const precios = body?.precios ?? {};

    for (const servicio of TRATAMIENTOS) {
      const precio = precios[servicio];
      await query(
        `INSERT INTO precios_servicios (servicio, precio) VALUES ($1, $2)
         ON CONFLICT (servicio) DO UPDATE SET precio = $2`,
        [servicio, precio === "" || precio == null ? null : Number(precio)]
      );
    }

    const { rows } = await query<{ servicio: string; precio: number | null }>(
      `SELECT servicio, precio::float8 AS precio FROM precios_servicios`
    );
    const mapa = Object.fromEntries(rows.map((r) => [r.servicio, r.precio]));
    const resultado = TRATAMIENTOS.map((servicio) => ({
      servicio,
      precio: mapa[servicio] ?? null,
    }));

    return NextResponse.json({ precios: resultado });
  } catch (err) {
    return errorJson(err);
  }
}
