import { NextRequest, NextResponse } from "next/server";
import pool, { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Historial de movimientos de un insumo (compras, usos, ajustes).
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const { rows } = await query(
      `SELECT id, tipo, cantidad::float8 AS cantidad, costo::float8 AS costo, proveedor, nota,
              creado_por_nombre, creado_en
       FROM inventario_movimientos WHERE inventario_id = $1 ORDER BY creado_en DESC LIMIT 30`,
      [Number(id)]
    );
    return NextResponse.json({ movimientos: rows });
  } catch (err) {
    return errorJson(err);
  }
}

// Registra un movimiento y ajusta la existencia en la misma transacción.
// compra: suma; uso: resta (sin bajar de 0); ajuste: suma o resta (signo).
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const inventarioId = Number(id);
  if (!Number.isInteger(inventarioId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const client = await pool.connect();
  try {
    const body = await req.json();
    const tipo = body?.tipo;
    const cantidad = Number(body?.cantidad);
    if (!["compra", "uso", "ajuste"].includes(tipo) || !Number.isFinite(cantidad) || cantidad === 0) {
      return NextResponse.json({ error: "tipo o cantidad inválidos" }, { status: 400 });
    }
    if (tipo !== "ajuste" && cantidad < 0) {
      return NextResponse.json({ error: "la cantidad debe ser positiva" }, { status: 400 });
    }
    const costo = body?.costo != null && body.costo !== "" ? Number(body.costo) : null;
    if (costo != null && (!Number.isFinite(costo) || costo < 0)) {
      return NextResponse.json({ error: "costo inválido" }, { status: 400 });
    }
    const proveedor = typeof body?.proveedor === "string" && body.proveedor.trim() ? body.proveedor.trim().slice(0, 120) : null;
    const nota = typeof body?.nota === "string" && body.nota.trim() ? body.nota.trim().slice(0, 500) : null;
    const delta = tipo === "uso" ? -cantidad : cantidad;
    const identidad = await identidadDesdeRequest(req);

    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE inventario SET cantidad = GREATEST(0, cantidad + $2), actualizado_en = now(),
              proveedor = COALESCE($3, proveedor)
       WHERE id = $1 RETURNING id`,
      [inventarioId, delta, tipo === "compra" ? proveedor : null]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "insumo no encontrado" }, { status: 404 });
    }
    await client.query(
      `INSERT INTO inventario_movimientos (inventario_id, tipo, cantidad, costo, proveedor, nota, creado_por_nombre)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [inventarioId, tipo, cantidad, costo, proveedor, nota, identidad.nombre]
    );
    await client.query("COMMIT");
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return errorJson(err);
  } finally {
    client.release();
  }
}
