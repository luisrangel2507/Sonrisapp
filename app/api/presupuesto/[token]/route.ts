import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import type { PresupuestoItem } from "@/lib/types";

// Ruta pública (fuera del middleware de sesión): el paciente entra con
// el link que le comparte la clínica y aprueba/rechaza sin necesitar cuenta.
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const { rows } = await query(
      `SELECT pr.id, pr.titulo, pr.notas, pr.estado, pr.nombre_respuesta, pr.respondido_en, pr.creado_en,
              p.nombre AS paciente_nombre
       FROM presupuestos pr
       JOIN pacientes p ON p.id = pr.paciente_id
       WHERE pr.token = $1`,
      [params.token]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }

    const { rows: items } = await query<PresupuestoItem>(
      `SELECT id, concepto, cantidad::float8 AS cantidad, precio_unitario::float8 AS precio_unitario
       FROM presupuesto_items WHERE presupuesto_id = $1 ORDER BY id`,
      [rows[0].id]
    );

    return NextResponse.json({ presupuesto: { ...rows[0], items } });
  } catch (err) {
    return errorJson(err);
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json().catch(() => ({}));
    const { estado, nombre_respuesta } = body ?? {};

    if (estado !== "aprobado" && estado !== "rechazado") {
      return NextResponse.json({ error: "estado inválido" }, { status: 400 });
    }
    if (!nombre_respuesta || typeof nombre_respuesta !== "string" || !nombre_respuesta.trim()) {
      return NextResponse.json({ error: "nombre_respuesta es requerido" }, { status: 400 });
    }

    const { rows: existentes } = await query<{ id: number; estado: string }>(
      `SELECT id, estado FROM presupuestos WHERE token = $1`,
      [params.token]
    );
    if (existentes.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }
    if (existentes[0].estado !== "pendiente") {
      return NextResponse.json({ error: "este presupuesto ya fue respondido" }, { status: 409 });
    }

    const { rows } = await query(
      `UPDATE presupuestos
       SET estado = $2, nombre_respuesta = $3, respondido_en = now()
       WHERE token = $1
       RETURNING id, titulo, notas, estado, nombre_respuesta, respondido_en, creado_en`,
      [params.token, estado, nombre_respuesta.trim()]
    );

    return NextResponse.json({ presupuesto: rows[0] });
  } catch (err) {
    return errorJson(err);
  }
}
