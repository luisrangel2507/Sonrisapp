import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Pacientes en tratamiento de ortodoncia: los que aprobaron un
// presupuesto de brackets/ortodoncia. Por cada uno: ajustes hechos desde
// que aprobó, último y próximo ajuste, y si va al corriente con los pagos
// (cuota inicial + ajustes realizados × monto por ajuste).
const ES_ORTODONCIA = `(c.tratamiento ILIKE '%ortodon%' OR c.tratamiento ILIKE '%bracket%' OR c.tratamiento ILIKE '%ajuste%')`;

export async function GET() {
  try {
    const { rows } = await query<{
      presupuesto_id: number;
      paciente_id: number;
      paciente_nombre: string;
      telefono: string | null;
      titulo: string;
      inicio: string;
      pago_inicial: number | null;
      monto_ajuste: number | null;
      ajustes_planeados: number | null;
      ajustes_hechos: number;
      ultimo_ajuste: string | null;
      proximo_ajuste: string | null;
      pagado: number;
    }>(
      `SELECT DISTINCT ON (pr.paciente_id)
              pr.id AS presupuesto_id, pr.paciente_id, p.nombre AS paciente_nombre, p.telefono, pr.titulo,
              pr.respondido_en AS inicio,
              pr.pago_inicial::float8 AS pago_inicial, pr.monto_ajuste::float8 AS monto_ajuste,
              pr.mensualidades AS ajustes_planeados,
              (SELECT COUNT(*)::int FROM citas c WHERE c.paciente_id = pr.paciente_id AND c.estado = 'completada'
                 AND c.fecha_hora >= pr.respondido_en AND ${ES_ORTODONCIA}) AS ajustes_hechos,
              (SELECT MAX(c.fecha_hora) FROM citas c WHERE c.paciente_id = pr.paciente_id AND c.estado = 'completada'
                 AND ${ES_ORTODONCIA}) AS ultimo_ajuste,
              (SELECT MIN(c.fecha_hora) FROM citas c WHERE c.paciente_id = pr.paciente_id AND c.estado = 'agendada'
                 AND c.fecha_hora >= now() AND ${ES_ORTODONCIA}) AS proximo_ajuste,
              COALESCE((SELECT SUM(pg.monto) FROM pagos pg WHERE pg.paciente_id = pr.paciente_id
                 AND pg.fecha >= pr.respondido_en - interval '1 day'), 0)::float8 AS pagado
       FROM presupuestos pr
       JOIN pacientes p ON p.id = pr.paciente_id
       WHERE pr.estado = 'aprobado' AND pr.respondido_en IS NOT NULL
         AND (pr.monto_ajuste IS NOT NULL OR pr.titulo ILIKE '%ortodon%' OR pr.titulo ILIKE '%bracket%'
              OR EXISTS (SELECT 1 FROM presupuesto_items it WHERE it.presupuesto_id = pr.id
                         AND (it.concepto ILIKE '%ortodon%' OR it.concepto ILIKE '%bracket%')))
       ORDER BY pr.paciente_id, pr.respondido_en DESC`
    );

    const pacientes = rows.map((r) => {
      const esperado = (r.pago_inicial ?? 0) + r.ajustes_hechos * (r.monto_ajuste ?? 0);
      const diasSinAjuste = r.ultimo_ajuste
        ? Math.floor((Date.now() - new Date(r.ultimo_ajuste).getTime()) / 86_400_000)
        : null;
      return {
        ...r,
        esperado,
        adeudo: Math.max(0, esperado - r.pagado),
        diasSinAjuste,
        // Más de 6 semanas sin ajuste y sin cita próxima: hay que llamarle.
        atrasado: !r.proximo_ajuste && (diasSinAjuste === null || diasSinAjuste > 42),
      };
    });

    return NextResponse.json({ pacientes });
  } catch (err) {
    return errorJson(err);
  }
}
