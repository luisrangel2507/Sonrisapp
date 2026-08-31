import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

// Ruta pública (fuera del middleware de sesión): el paciente entra con
// el link que le comparte la clínica — mismo historial_token que usa
// el formulario de historia clínica, sin necesitar cuenta.
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const { rows: pacienteRows } = await query<{
      id: number;
      nombre: string;
      folio: string | null;
      puntos: number;
      meta_premio: number;
      premio_actual: string | null;
      fecha_nacimiento: string | null;
      creado_en: string;
      visitas_totales: number;
    }>(
      `SELECT id, nombre, folio, puntos, meta_premio, premio_actual, fecha_nacimiento, creado_en, visitas_totales
       FROM pacientes WHERE historial_token = $1`,
      [params.token]
    );

    if (pacienteRows.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }
    const paciente = pacienteRows[0];

    const { rows: proximaCita } = await query<{ tratamiento: string; fecha_hora: string }>(
      `SELECT tratamiento, fecha_hora FROM citas
       WHERE paciente_id = $1 AND estado = 'agendada' AND fecha_hora > now()
       ORDER BY fecha_hora ASC LIMIT 1`,
      [paciente.id]
    );

    const { rows: historial } = await query<{ tratamiento: string; fecha_hora: string }>(
      `SELECT tratamiento, fecha_hora FROM citas
       WHERE paciente_id = $1 AND estado = 'completada'
       ORDER BY fecha_hora DESC LIMIT 10`,
      [paciente.id]
    );

    return NextResponse.json({
      paciente: {
        nombre: paciente.nombre,
        folio: paciente.folio,
        puntos: paciente.puntos,
        meta_premio: paciente.meta_premio,
        premio_actual: paciente.premio_actual,
        fecha_nacimiento: paciente.fecha_nacimiento,
        creado_en: paciente.creado_en,
        visitas_totales: paciente.visitas_totales,
      },
      proxima_cita: proximaCita[0] ?? null,
      historial,
    });
  } catch (err) {
    return errorJson(err);
  }
}
