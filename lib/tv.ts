import { query } from "@/lib/db";

export async function versionTv(): Promise<number> {
  const { rows } = await query<{ tv_version: number }>(`SELECT tv_version FROM pantalla_tv WHERE id = 1`);
  return rows[0]?.tv_version ?? 1;
}

export interface EstadoTv {
  modo: "espera" | "bienvenida" | "gracias";
  nombres: string[];
  hora: string | null;
  origen: "manual" | "agenda";
}

// Lo que se muestra en la TV: primero lo que se eligió a mano (vale 10
// minutos); si no hay nada, se arma solo con la agenda de hoy — bienvenida
// al paciente que sigue con cita agendada y, si ya no queda ninguno,
// agradecimiento al último que se atendió.
export async function estadoTv(): Promise<EstadoTv> {
  const { rows } = await query<{ modo: string; nombre: string | null; hora: string | null; vigente: boolean }>(
    `SELECT modo, nombre, hora, (actualizado_en > now() - interval '10 minutes') AS vigente FROM pantalla_tv WHERE id = 1`
  );
  const manual = rows[0];
  if (manual && manual.modo !== "espera" && manual.vigente && manual.nombre) {
    return { modo: manual.modo as EstadoTv["modo"], nombres: [manual.nombre], hora: manual.hora, origen: "manual" };
  }

  const hoy = `(c.fecha_hora AT TIME ZONE 'America/Mexico_City')::date = (now() AT TIME ZONE 'America/Mexico_City')::date`;
  const { rows: agendadas } = await query<{ nombre: string; hora: string }>(
    `SELECT p.nombre, to_char(c.fecha_hora AT TIME ZONE 'America/Mexico_City', 'HH24:MI') AS hora FROM citas c JOIN pacientes p ON p.id = c.paciente_id
     WHERE c.estado = 'agendada' AND c.pendiente_aprobacion IS NOT TRUE AND ${hoy}
     ORDER BY c.fecha_hora LIMIT 1`
  );
  if (agendadas[0]) {
    return { modo: "bienvenida", nombres: [agendadas[0].nombre], hora: agendadas[0].hora, origen: "agenda" };
  }
  const { rows: atendidas } = await query<{ nombre: string }>(
    `SELECT p.nombre FROM citas c JOIN pacientes p ON p.id = c.paciente_id
     WHERE c.estado = 'completada' AND ${hoy}
     ORDER BY c.fecha_hora DESC LIMIT 1`
  );
  if (atendidas[0]) {
    return { modo: "gracias", nombres: [atendidas[0].nombre], hora: null, origen: "agenda" };
  }
  return { modo: "espera", nombres: [], hora: null, origen: "agenda" };
}
