import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { generarHistorialToken } from "@/lib/historial-token";
import type { PresupuestoItem } from "@/lib/types";

interface ItemEntrada {
  concepto: string;
  cantidad: number;
  precio_unitario: number;
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows: presupuestos } = await query(
      `SELECT id, paciente_id, titulo, notas, token, estado, nombre_respuesta, respondido_en, creado_en
       FROM presupuestos WHERE paciente_id = $1 ORDER BY creado_en DESC`,
      [pacienteId]
    );

    if (presupuestos.length === 0) {
      return NextResponse.json({ presupuestos: [] });
    }

    const ids = presupuestos.map((p) => p.id);
    const { rows: items } = await query<PresupuestoItem & { presupuesto_id: number }>(
      `SELECT id, presupuesto_id, concepto, cantidad::float8 AS cantidad, precio_unitario::float8 AS precio_unitario
       FROM presupuesto_items WHERE presupuesto_id = ANY($1) ORDER BY id`,
      [ids]
    );

    const itemsPorPresupuesto = new Map<number, PresupuestoItem[]>();
    for (const { presupuesto_id, ...item } of items) {
      const lista = itemsPorPresupuesto.get(presupuesto_id) ?? [];
      lista.push(item);
      itemsPorPresupuesto.set(presupuesto_id, lista);
    }

    const resultado = presupuestos.map((p) => ({ ...p, items: itemsPorPresupuesto.get(p.id) ?? [] }));

    return NextResponse.json({ presupuestos: resultado });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { titulo, notas, items } = body ?? {};

    if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
      return NextResponse.json({ error: "título es requerido" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "agrega al menos un concepto" }, { status: 400 });
    }

    const itemsValidos: ItemEntrada[] = [];
    for (const item of items as unknown[]) {
      const it = item as Partial<ItemEntrada>;
      if (!it || typeof it.concepto !== "string" || !it.concepto.trim()) {
        return NextResponse.json({ error: "cada concepto necesita un nombre" }, { status: 400 });
      }
      const cantidad = Number(it.cantidad);
      const precioUnitario = Number(it.precio_unitario);
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return NextResponse.json({ error: `cantidad inválida en "${it.concepto}"` }, { status: 400 });
      }
      if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
        return NextResponse.json({ error: `precio inválido en "${it.concepto}"` }, { status: 400 });
      }
      itemsValidos.push({ concepto: it.concepto.trim(), cantidad, precio_unitario: precioUnitario });
    }

    const token = generarHistorialToken();

    const { rows } = await query(
      `INSERT INTO presupuestos (paciente_id, titulo, notas, token)
       VALUES ($1, $2, $3, $4)
       RETURNING id, paciente_id, titulo, notas, token, estado, nombre_respuesta, respondido_en, creado_en`,
      [pacienteId, titulo.trim(), notas || null, token]
    );
    const presupuesto = rows[0];

    const itemsGuardados: PresupuestoItem[] = [];
    for (const it of itemsValidos) {
      const { rows: itemRows } = await query<PresupuestoItem>(
        `INSERT INTO presupuesto_items (presupuesto_id, concepto, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)
         RETURNING id, concepto, cantidad::float8 AS cantidad, precio_unitario::float8 AS precio_unitario`,
        [presupuesto.id, it.concepto, it.cantidad, it.precio_unitario]
      );
      itemsGuardados.push(itemRows[0]);
    }

    return NextResponse.json({ presupuesto: { ...presupuesto, items: itemsGuardados } }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
