import { NextRequest, NextResponse } from "next/server";
import { identidadDesdeRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
        -- Semana/mes anterior — solo para mostrar la flecha de tendencia
        -- en las tarjetas del panel de escritorio (↑/↓ vs. periodo previo).
        (SELECT COUNT(*)::int FROM citas
          WHERE fecha_hora >= limites.semana_inicio - interval '7 days'
            AND fecha_hora < limites.semana_inicio
            AND estado <> 'cancelada') AS citas_semana_pasada,
        (SELECT COALESCE(SUM(monto), 0)::float8 FROM pagos
          WHERE fecha >= limites.mes_inicio) AS ingresos_mes,
        (SELECT COALESCE(SUM(monto), 0)::float8 FROM pagos
          WHERE fecha >= limites.mes_inicio - interval '1 month'
            AND fecha < limites.mes_inicio) AS ingresos_mes_pasado,
        (SELECT COALESCE(SUM(c.monto - COALESCE(p.pagado, 0)), 0)::float8
          FROM citas c
          LEFT JOIN pagos_por_cita p ON p.cita_id = c.id
          WHERE c.estado <> 'cancelada' AND c.monto IS NOT NULL) AS por_cobrar,
        (SELECT COUNT(*)::int FROM pacientes WHERE activo = true) AS pacientes_activos
      FROM limites
    `);

    // Servicios más realizados del mes (citas completadas), en horario
    // de México igual que el resto del resumen.
    const { rows: top } = await query<{ tratamiento: string; total: number }>(`
      SELECT tratamiento, COUNT(*)::int AS total FROM citas
      WHERE estado = 'completada'
        AND fecha_hora >= (date_trunc('month', (now() AT TIME ZONE 'America/Mexico_City'))::timestamp AT TIME ZONE 'America/Mexico_City')
      GROUP BY tratamiento ORDER BY total DESC, tratamiento LIMIT 3
    `);

    const resumen: Record<string, unknown> = { ...rows[0], top_servicios_mes: top };
    // El rol Asistente no ve los ingresos del consultorio.
    if ((await identidadDesdeRequest(req)).rol === "asistente") {
      resumen.ingresos_mes = null;
      resumen.ingresos_mes_pasado = null;
    }
    return NextResponse.json({ resumen });
  } catch (err) {
    return errorJson(err);
  }
}
