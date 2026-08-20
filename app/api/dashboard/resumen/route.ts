import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // "Hoy"/"esta semana"/"este mes" se calculan en horario de México, no
    // en el del servidor (Railway/Neon corren en UTC) — si no, una cita
    // de las 7pm ya cuenta como "mañana" en la BD aunque en la app (que
    // agrupa con la hora local del celular) siga apareciendo como hoy.
    const { rows } = await query(`
      WITH limites AS (
        SELECT
          date_trunc('day', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City' AS hoy_inicio,
          date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City' AS semana_inicio,
          date_trunc('month', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City' AS mes_inicio
      ),
      pagos_por_cita AS (
        SELECT cita_id, COALESCE(SUM(monto), 0) AS pagado
        FROM pagos GROUP BY cita_id
      )
      SELECT
        (SELECT COUNT(*)::int FROM citas
          WHERE fecha_hora >= limites.hoy_inicio AND fecha_hora < limites.hoy_inicio + interval '1 day'
            AND estado <> 'cancelada') AS citas_hoy,
        (SELECT COUNT(*)::int FROM citas
          WHERE fecha_hora >= limites.semana_inicio
            AND fecha_hora < limites.semana_inicio + interval '7 days'
            AND estado <> 'cancelada') AS citas_semana,
        (SELECT COUNT(*)::int FROM citas
          WHERE fecha_hora >= limites.semana_inicio
            AND fecha_hora < limites.semana_inicio + interval '7 days'
            AND estado = 'agendada') AS citas_semana_confirmadas,
        (SELECT COALESCE(SUM(monto), 0)::float8 FROM pagos
          WHERE fecha >= limites.mes_inicio) AS ingresos_mes,
        (SELECT COALESCE(SUM(c.monto - COALESCE(p.pagado, 0)), 0)::float8
          FROM citas c
          LEFT JOIN pagos_por_cita p ON p.cita_id = c.id
          WHERE c.estado <> 'cancelada' AND c.monto IS NOT NULL) AS por_cobrar
      FROM limites
    `);

    return NextResponse.json({ resumen: rows[0] });
  } catch (err) {
    return errorJson(err);
  }
}
