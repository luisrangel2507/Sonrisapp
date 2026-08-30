import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ESTADO_DIENTE, NUMEROS_FDI, type EstadoDiente } from "@/lib/dental";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";
import { cifrar } from "@/lib/crypto";

// Para procedimientos que aplican a toda la boca (limpieza, fluorización,
// etc.) — crea el mismo registro en los 32 dientes de una sola vez, en
// vez de tener que repetirlo diente por diente. Todo o nada: si algo
// falla a la mitad, no se queda aplicado solo a unos cuantos dientes.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const client = await pool.connect();
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "parámetros inválidos" }, { status: 400 });
    }

    const body = await req.json();
    const { tipo, nota, estado } = body ?? {};

    if (!tipo || typeof tipo !== "string") {
      return NextResponse.json({ error: "tipo es requerido" }, { status: 400 });
    }
    if (estado && !(estado in ESTADO_DIENTE)) {
      return NextResponse.json({ error: "estado inválido" }, { status: 400 });
    }

    const nuevoEstado: EstadoDiente | undefined = estado;
    const identidad = await identidadDesdeRequest(req);
    const notaCifrada = cifrar(nota ?? null);

    await client.query("BEGIN");
    for (const numeroFdi of NUMEROS_FDI) {
      const { rows: dienteRows } = await client.query<{ id: number }>(
        `INSERT INTO paciente_dientes (paciente_id, numero_fdi, estado)
         VALUES ($1, $2, COALESCE($3, 'sano'))
         ON CONFLICT (paciente_id, numero_fdi)
         DO UPDATE SET estado = COALESCE($3, paciente_dientes.estado)
         RETURNING id`,
        [pacienteId, numeroFdi, nuevoEstado ?? null]
      );
      const dienteId = dienteRows[0].id;
      await client.query(
        `INSERT INTO diente_historial (paciente_diente_id, tipo, nota, creado_por, creado_por_nombre)
         VALUES ($1, $2, $3, $4, $5)`,
        [dienteId, tipo, notaCifrada, identidad.usuarioId, identidad.nombre]
      );
    }
    await client.query("COMMIT");

    return NextResponse.json({ ok: true, aplicados: NUMEROS_FDI.length }, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    return errorJson(err);
  } finally {
    client.release();
  }
}
