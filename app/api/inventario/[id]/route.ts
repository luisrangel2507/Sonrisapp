import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const COLUMNAS = `id, nombre, cantidad::float8 AS cantidad, unidad, cantidad_minima::float8 AS cantidad_minima, notas, actualizado_en`;

const CAMPOS_EDITABLES = ["nombre", "cantidad", "unidad", "cantidad_minima", "notas"] as const;

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const actualizaciones = CAMPOS_EDITABLES.filter((campo) => campo in (body ?? {}));

    if (actualizaciones.length === 0) {
      return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
    }

    const asignaciones = actualizaciones.map((campo, i) => `${campo} = $${i + 2}`).join(", ");
    const valores = actualizaciones.map((campo) => {
      const valor = body[campo];
      if (campo === "cantidad" || campo === "cantidad_minima") {
        return valor === "" || valor == null ? null : Number(valor);
      }
      return valor === "" ? null : valor;
    });

    const { rows } = await query(
      `UPDATE inventario SET ${asignaciones}, actualizado_en = now() WHERE id = $1 RETURNING ${COLUMNAS}`,
      [id, ...valores]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "insumo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ item: rows[0] });
  } catch (err) {
    return errorJson(err);
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows } = await query(`DELETE FROM inventario WHERE id = $1 RETURNING id`, [id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "insumo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
