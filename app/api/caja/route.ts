import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const ZONA = "America/Mexico_City";

// Corte de caja de un día (pagos cobrados, por método) y saldos
// pendientes por paciente (lo cobrado en citas ya completadas menos lo
// pagado).
export async function GET(req: NextRequest) {
  try {
    const fechaParam = req.nextUrl.searchParams.get("fecha");
    const fecha = fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? fechaParam : null;

    const { rows: pagos } = await query<{
      id: number;
      monto: number;
      metodo: string;
      fecha: string;
      paciente_id: number;
      paciente_nombre: string;
      tratamiento: string | null;
    }>(
      `SELECT pg.id, pg.monto::float8 AS monto, pg.metodo, pg.fecha, pg.paciente_id,
              p.nombre AS paciente_nombre, c.tratamiento
       FROM pagos pg
       JOIN pacientes p ON p.id = pg.paciente_id
       LEFT JOIN citas c ON c.id = pg.cita_id
       WHERE (pg.fecha AT TIME ZONE '${ZONA}')::date = COALESCE($1::date, (now() AT TIME ZONE '${ZONA}')::date)
       ORDER BY pg.fecha`,
      [fecha]
    );

    const { rows: saldos } = await query<{
      paciente_id: number;
      paciente_nombre: string;
      telefono: string | null;
      cobrado: number;
      pagado: number;
      saldo: number;
    }>(
      `WITH cobrado AS (
         SELECT paciente_id, SUM(monto) AS total FROM citas
         WHERE estado = 'completada' AND monto IS NOT NULL GROUP BY paciente_id
       ), pagado AS (
         SELECT paciente_id, SUM(monto) AS total FROM pagos GROUP BY paciente_id
       )
       SELECT p.id AS paciente_id, p.nombre AS paciente_nombre, p.telefono,
              co.total::float8 AS cobrado, COALESCE(pa.total, 0)::float8 AS pagado,
              (co.total - COALESCE(pa.total, 0))::float8 AS saldo
       FROM cobrado co
       JOIN pacientes p ON p.id = co.paciente_id
       LEFT JOIN pagado pa ON pa.paciente_id = co.paciente_id
       WHERE co.total - COALESCE(pa.total, 0) > 0.5
       ORDER BY saldo DESC`
    );

    const porMetodo: Record<string, number> = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    for (const p of pagos) porMetodo[p.metodo] = (porMetodo[p.metodo] ?? 0) + p.monto;

    return NextResponse.json({
      pagos,
      porMetodo,
      total: pagos.reduce((t, p) => t + p.monto, 0),
      saldos,
      totalPorCobrar: saldos.reduce((t, s) => t + s.saldo, 0),
    });
  } catch (err) {
    return errorJson(err);
  }
}
