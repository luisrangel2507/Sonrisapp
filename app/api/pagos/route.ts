import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";

const METODOS_VALIDOS = ["efectivo", "tarjeta", "transferencia"];

export async function GET(req: NextRequest) {
  try {
    const citaId = req.nextUrl.searchParams.get("cita_id");
    const pacienteId = req.nextUrl.searchParams.get("paciente_id");

    const condiciones: string[] = [];
    const params: unknown[] = [];
    if (citaId) {
      params.push(Number(citaId));
      condiciones.push(`cita_id = $${params.length}`);
    }
    if (pacienteId) {
      params.push(Number(pacienteId));
      condiciones.push(`paciente_id = $${params.length}`);
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT id, cita_id, monto::float8 AS monto, metodo, fecha, nota
       FROM pagos ${where} ORDER BY fecha DESC`,
      params
    );
    return NextResponse.json({ pagos: rows });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cita_id, paciente_id, monto, metodo, nota } = body ?? {};

    if (!cita_id || !paciente_id || !monto || Number(monto) <= 0) {
      return NextResponse.json(
        { error: "cita_id, paciente_id y monto (mayor a 0) son requeridos" },
        { status: 400 }
      );
    }

    const metodoFinal = METODOS_VALIDOS.includes(metodo) ? metodo : "efectivo";

    const { rows } = await query(
      `INSERT INTO pagos (cita_id, paciente_id, monto, metodo, nota)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, cita_id, monto::float8 AS monto, metodo, fecha, nota`,
      [cita_id, paciente_id, monto, metodoFinal, nota ?? null]
    );

    return NextResponse.json({ pago: rows[0] }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}

// DELETE /api/pagos?cita_id=X — deshace el pago más reciente de esa
// cita (p. ej. si se registró por error y en realidad no se pagó).
// NOM-024: aunque el pago sí se borra de `pagos` (para no tocar las
// sumas de ingresos/por-cobrar que ya calculan varios reportes), el
// motivo y quién lo deshizo quedan en pagos_revertidos.
export async function DELETE(req: NextRequest) {
  try {
    const citaId = req.nextUrl.searchParams.get("cita_id");
    if (!citaId) {
      return NextResponse.json({ error: "cita_id es requerido" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";
    if (!motivo) {
      return NextResponse.json({ error: "motivo es requerido" }, { status: 400 });
    }

    const identidad = await identidadDesdeRequest(req);

    const { rows } = await query<{
      id: number;
      cita_id: number;
      paciente_id: number;
      monto: number;
      metodo: string;
    }>(
      `DELETE FROM pagos WHERE id = (
         SELECT id FROM pagos WHERE cita_id = $1 ORDER BY fecha DESC, id DESC LIMIT 1
       )
       RETURNING id, cita_id, paciente_id, monto::float8 AS monto, metodo`,
      [Number(citaId)]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "esta cita no tiene pagos que deshacer" }, { status: 404 });
    }

    const pago = rows[0];
    await query(
      `INSERT INTO pagos_revertidos (pago_id, cita_id, paciente_id, monto, metodo, motivo, revertido_por_nombre)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [pago.id, pago.cita_id, pago.paciente_id, pago.monto, pago.metodo, motivo, identidad.nombre]
    );

    return NextResponse.json({ ok: true, id: pago.id });
  } catch (err) {
    return errorJson(err);
  }
}
