import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Los límites de mes se calculan en horario de México, igual que en
// /api/dashboard/resumen. El ::timestamp explícito antes de AT TIME
// ZONE es obligatorio: aplicado directo sobre un `date`, Postgres
// resuelve al overload equivocado y corre los límites 12 horas
// (ver el fix de "Ingresos del mes" en el Panel).
export async function GET() {
  try {
    const { rows: porMes } = await query<{ mes: string; ingresos: number; pacientes_nuevos: number }>(`
      WITH hoy AS (
        SELECT (now() AT TIME ZONE 'America/Mexico_City')::date AS d
      ),
      meses AS (
        SELECT generate_series(
          date_trunc('month', d) - interval '5 months',
          date_trunc('month', d),
          interval '1 month'
        )::date AS mes_inicio
        FROM hoy
      ),
      limites AS (
        SELECT
          mes_inicio,
          (mes_inicio::timestamp AT TIME ZONE 'America/Mexico_City') AS inicio,
          ((mes_inicio + interval '1 month')::timestamp AT TIME ZONE 'America/Mexico_City') AS fin
        FROM meses
      )
      SELECT
        to_char(l.mes_inicio, 'YYYY-MM') AS mes,
        COALESCE((SELECT SUM(monto) FROM pagos WHERE fecha >= l.inicio AND fecha < l.fin), 0)::float8 AS ingresos,
        (SELECT COUNT(*) FROM pacientes WHERE creado_en >= l.inicio AND creado_en < l.fin)::int AS pacientes_nuevos
      FROM limites l
      ORDER BY l.mes_inicio
    `);

    const { rows: porEstado } = await query<{ estado: string; total: number }>(`
      WITH hoy AS (
        SELECT (now() AT TIME ZONE 'America/Mexico_City')::date AS d
      ),
      inicio6 AS (
        SELECT ((date_trunc('month', d) - interval '5 months')::timestamp AT TIME ZONE 'America/Mexico_City') AS inicio
        FROM hoy
      )
      SELECT estado, COUNT(*)::int AS total
      FROM citas, inicio6
      WHERE fecha_hora >= inicio6.inicio
      GROUP BY estado
    `);

    const { rows: porTratamiento } = await query<{ tratamiento: string; total: number }>(`
      WITH hoy AS (
        SELECT (now() AT TIME ZONE 'America/Mexico_City')::date AS d
      ),
      inicio6 AS (
        SELECT ((date_trunc('month', d) - interval '5 months')::timestamp AT TIME ZONE 'America/Mexico_City') AS inicio
        FROM hoy
      )
      SELECT c.tratamiento, SUM(p.monto)::float8 AS total
      FROM pagos p
      JOIN citas c ON c.id = p.cita_id, inicio6
      WHERE p.fecha >= inicio6.inicio
      GROUP BY c.tratamiento
      ORDER BY total DESC
      LIMIT 8
    `);

    const citasPorEstado = { agendada: 0, completada: 0, cancelada: 0 };
    for (const r of porEstado) {
      if (r.estado in citasPorEstado) citasPorEstado[r.estado as keyof typeof citasPorEstado] = r.total;
    }
    const totalCitas6m = citasPorEstado.agendada + citasPorEstado.completada + citasPorEstado.cancelada;
    const tasaCancelacion = totalCitas6m > 0 ? (citasPorEstado.cancelada / totalCitas6m) * 100 : 0;

    return NextResponse.json({
      reportes: {
        ingresos_por_mes: porMes.map((r) => ({ mes: r.mes, total: r.ingresos })),
        pacientes_nuevos_por_mes: porMes.map((r) => ({ mes: r.mes, total: r.pacientes_nuevos })),
        citas_por_estado: citasPorEstado,
        ingresos_por_tratamiento: porTratamiento.map((r) => ({ tratamiento: r.tratamiento, total: r.total })),
        ingresos_totales_6m: porMes.reduce((s, r) => s + r.ingresos, 0),
        pacientes_nuevos_6m: porMes.reduce((s, r) => s + r.pacientes_nuevos, 0),
        tasa_cancelacion_6m: tasaCancelacion,
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
