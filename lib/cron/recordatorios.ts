import { query } from "@/lib/db";
import { enviarWhatsApp, mensajeResumenHoy, mensajeRecordatorio1h } from "@/lib/whatsapp";

function formatearHoraMx(fechaHora: string) {
  return new Date(fechaHora).toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  });
}

// Pensado para dispararse una vez al día a las 8am hora de México — manda
// un WhatsApp a cada paciente con las citas que tiene agendadas hoy.
// Idempotente vía avisos_diarios: si el cron se dispara dos veces el
// mismo día, no se duplica el mensaje.
export async function enviarResumenDiario() {
  const { rows: hoyRows } = await query<{ hoy: string }>(
    `SELECT (date_trunc('day', now() AT TIME ZONE 'America/Mexico_City'))::date AS hoy`
  );
  const hoy = hoyRows[0].hoy;

  const { rows: citas } = await query<{
    paciente_id: number;
    nombre: string;
    telefono: string | null;
    fecha_hora: string;
    tratamiento: string;
  }>(
    `WITH limites AS (
       SELECT date_trunc('day', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City' AS inicio
     )
     SELECT c.paciente_id, p.nombre, p.telefono, c.fecha_hora, c.tratamiento
     FROM citas c
     JOIN pacientes p ON p.id = c.paciente_id, limites
     WHERE c.estado = 'agendada'
       AND c.fecha_hora >= limites.inicio AND c.fecha_hora < limites.inicio + interval '1 day'
     ORDER BY c.paciente_id, c.fecha_hora`
  );

  const porPaciente = new Map<
    number,
    { nombre: string; telefono: string | null; citas: { hora: string; tratamiento: string }[] }
  >();
  for (const c of citas) {
    if (!porPaciente.has(c.paciente_id)) {
      porPaciente.set(c.paciente_id, { nombre: c.nombre, telefono: c.telefono, citas: [] });
    }
    porPaciente.get(c.paciente_id)!.citas.push({
      hora: formatearHoraMx(c.fecha_hora),
      tratamiento: c.tratamiento,
    });
  }

  let enviados = 0;
  for (const [pacienteId, info] of Array.from(porPaciente.entries())) {
    if (!info.telefono) continue;

    const { rowCount } = await query(
      `INSERT INTO avisos_diarios (paciente_id, fecha, tipo) VALUES ($1, $2, 'resumen_hoy')
       ON CONFLICT DO NOTHING`,
      [pacienteId, hoy]
    );
    if (rowCount === 0) continue; // ya se le mandó hoy

    await enviarWhatsApp(info.telefono, mensajeResumenHoy(info.nombre, info.citas));
    enviados++;
  }

  return { pacientesConCitaHoy: porPaciente.size, mensajesEnviados: enviados };
}

// Pensado para dispararse cada 10-15 minutos — manda un recordatorio a
// quien tenga una cita entre 50 y 70 minutos a partir de ahora. La
// ventana es más ancha que el intervalo del cron para no dejar citas
// sin avisar si un disparo se retrasa o se pierde.
export async function enviarRecordatoriosHoraAntes() {
  const { rows: citas } = await query<{
    id: number;
    nombre: string;
    telefono: string | null;
    fecha_hora: string;
    tratamiento: string;
  }>(
    `SELECT c.id, p.nombre, p.telefono, c.fecha_hora, c.tratamiento
     FROM citas c
     JOIN pacientes p ON p.id = c.paciente_id
     WHERE c.estado = 'agendada'
       AND c.recordatorio_1h_enviado = false
       AND c.fecha_hora - now() BETWEEN interval '50 minutes' AND interval '70 minutes'`
  );

  let enviados = 0;
  for (const c of citas) {
    await query(`UPDATE citas SET recordatorio_1h_enviado = true WHERE id = $1`, [c.id]);
    if (c.telefono) {
      await enviarWhatsApp(
        c.telefono,
        mensajeRecordatorio1h(c.nombre, formatearHoraMx(c.fecha_hora), c.tratamiento)
      );
      enviados++;
    }
  }

  return { citasEnVentana: citas.length, mensajesEnviados: enviados };
}
