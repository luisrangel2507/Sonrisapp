import { query } from "@/lib/db";
import { enviarWhatsApp, mensajeCumpleanos } from "@/lib/whatsapp";

// Job diario del CRM: felicitaciones de cumpleaños por WhatsApp.
// El aviso de "llegaste a tu meta" se dispara en el momento en
// app/api/citas/route.ts (PATCH), cuando la cita se marca completada.
export async function correrCrmDiario() {
  const anioActual = new Date().getUTCFullYear();

  const { rows: cumpleaneros } = await query<{
    id: number;
    nombre: string;
    telefono: string | null;
  }>(
    `SELECT id, nombre, telefono
     FROM pacientes
     WHERE fecha_nacimiento IS NOT NULL
       AND EXTRACT(MONTH FROM fecha_nacimiento) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(DAY FROM fecha_nacimiento) = EXTRACT(DAY FROM CURRENT_DATE)
       AND (ultima_felicitacion_anio IS NULL OR ultima_felicitacion_anio < $1)`,
    [anioActual]
  );

  let enviados = 0;
  for (const paciente of cumpleaneros) {
    if (paciente.telefono) {
      await enviarWhatsApp(paciente.telefono, mensajeCumpleanos(paciente.nombre));
      enviados++;
    }
    await query(`UPDATE pacientes SET ultima_felicitacion_anio = $2 WHERE id = $1`, [
      paciente.id,
      anioActual,
    ]);
  }

  return { cumpleaneros: cumpleaneros.length, mensajesEnviados: enviados };
}
