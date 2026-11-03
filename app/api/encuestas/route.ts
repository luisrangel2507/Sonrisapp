import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Resumen de satisfacción para Reportes (protegido por proxy.ts).
export async function GET() {
  try {
    const { rows: resumen } = await query<{ total: number; respondidas: number; promedio: number | null }>(
      `SELECT COUNT(*)::int AS total, COUNT(respondido_en)::int AS respondidas,
              ROUND(AVG(calificacion)::numeric, 1)::float8 AS promedio
       FROM encuestas WHERE creado_en >= now() - interval '90 days'`
    );
    const { rows: distribucion } = await query<{ calificacion: number; n: number }>(
      `SELECT calificacion, COUNT(*)::int AS n FROM encuestas
       WHERE respondido_en IS NOT NULL AND creado_en >= now() - interval '90 days'
       GROUP BY calificacion`
    );
    const { rows: ultimas } = await query(
      `SELECT e.id, e.paciente_id, p.nombre, e.calificacion, e.comentario, e.respondido_en
       FROM encuestas e JOIN pacientes p ON p.id = e.paciente_id
       WHERE e.respondido_en IS NOT NULL ORDER BY e.respondido_en DESC LIMIT 10`
    );
    return NextResponse.json({ ...resumen[0], distribucion, ultimas });
  } catch (err) {
    return errorJson(err);
  }
}
