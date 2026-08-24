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
    //
    // La semana empieza en domingo (igual que el selector de semana de
    // la pestaña Citas, que usa Date.getDay() en JS) — date_trunc('week', …)
    // de Postgres arranca en lunes, y esa diferencia hacía que "Citas
    // esta semana" del Panel no coincidiera con lo que se ve en Citas.
    //
    // ::timestamp antes de AT TIME ZONE es obligatorio: aplicado
    // directamente sobre un `date`, Postgres resuelve al overload de
    // timestamptz (usa la zona del servidor, no la de México) y da un
    // resultado corrido 12 horas — eso hacía que "Ingresos del mes" no
    // cuadrara con los pagos reales cerca del cambio de día/mes.
    const { rows } = await query(`
      WITH hoy AS (
        SELECT (now() AT TIME ZONE 'America/Mexico_City')::date AS d
      ),
      limites AS (
        SELECT
          (d::timestamp AT TIME ZONE 'America/Mexico_City') AS hoy_inicio,
          ((d - EXTRACT(DOW FROM d)::int)::timestamp AT TIME ZONE 'America/Mexico_City') AS semana_inicio,
          (date_trunc('month', d)::timestamp AT TIME ZONE 'America/Mexico_City') AS mes_inicio
        FROM hoy
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
