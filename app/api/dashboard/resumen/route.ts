import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { rows } = await query(`
      WITH pagos_por_cita AS (
        SELECT cita_id, COALESCE(SUM(monto), 0) AS pagado
        FROM pagos GROUP BY cita_id
      )
      SELECT
        (SELECT COUNT(*)::int FROM citas
          WHERE fecha_hora::date = CURRENT_DATE AND estado <> 'cancelada') AS citas_hoy,
        (SELECT COUNT(*)::int FROM citas
          WHERE fecha_hora >= date_trunc('week', CURRENT_DATE)
            AND fecha_hora < date_trunc('week', CURRENT_DATE) + interval '7 days'
            AND estado <> 'cancelada') AS citas_semana,
        (SELECT COUNT(*)::int FROM citas
          WHERE fecha_hora >= date_trunc('week', CURRENT_DATE)
            AND fecha_hora < date_trunc('week', CURRENT_DATE) + interval '7 days'
            AND estado = 'agendada') AS citas_semana_confirmadas,
        (SELECT COALESCE(SUM(monto), 0)::float8 FROM pagos
          WHERE fecha >= date_trunc('month', CURRENT_DATE)) AS ingresos_mes,
        (SELECT COALESCE(SUM(c.monto - COALESCE(p.pagado, 0)), 0)::float8
          FROM citas c
          LEFT JOIN pagos_por_cita p ON p.cita_id = c.id
          WHERE c.estado <> 'cancelada' AND c.monto IS NOT NULL) AS por_cobrar
    `);

    return NextResponse.json({ resumen: rows[0] });
  } catch (err) {
    return errorJson(err);
  }
}
