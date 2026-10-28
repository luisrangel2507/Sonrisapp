import { NextRequest, NextResponse } from "next/server";
import { limitarPublico } from "@/lib/limite-publico";
import { query } from "@/lib/db";
import { generarFolio } from "@/lib/folio";
import { generarHistorialToken } from "@/lib/historial-token";
import { PACIENTE_COLUMNAS } from "@/lib/paciente-columns";
import { errorJson } from "@/lib/api-error";
import { horaYDiaEnMexico, horariosDelDia } from "@/lib/horarios-publicos";
import { enviarWhatsApp, mensajeSolicitudCita } from "@/lib/whatsapp";
import { NUMEROS_FDI } from "@/lib/dental";

export const dynamic = "force-dynamic";

// Ruta pública (fuera del middleware de sesión): el link para
// Instagram/redes que da de alta a un paciente nuevo y aparta un
// horario, sin necesitar que el consultorio lo capture primero. Queda
// como "pendiente de aprobación" — la doctora la revisa y confirma
// desde el dashboard antes de que sea una cita oficial.
export async function POST(req: NextRequest) {
  const limitado = await limitarPublico(req, "agendar", 5, 60, 20_000);
  if (limitado) return limitado;
  try {
    const body = await req.json();
    const { nombre, telefono, tratamiento, fecha_hora, aviso_privacidad } = body ?? {};

    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return NextResponse.json({ error: "nombre es requerido" }, { status: 400 });
    }
    if (!telefono || typeof telefono !== "string" || !telefono.trim()) {
      return NextResponse.json({ error: "teléfono es requerido" }, { status: 400 });
    }
    if (!tratamiento || typeof tratamiento !== "string") {
      return NextResponse.json({ error: "elige qué tipo de consulta quieres" }, { status: 400 });
    }
    if (aviso_privacidad !== true) {
      return NextResponse.json({ error: "acepta el aviso de privacidad para continuar" }, { status: 400 });
    }
    if (typeof tratamiento === "string" && tratamiento.length > 160) {
      return NextResponse.json({ error: "tratamiento inválido" }, { status: 400 });
    }
    if (!fecha_hora || typeof fecha_hora !== "string") {
      return NextResponse.json({ error: "elige fecha y hora" }, { status: 400 });
    }

    const fecha = new Date(fecha_hora);
    if (Number.isNaN(fecha.getTime()) || fecha.getTime() <= Date.now()) {
      return NextResponse.json({ error: "elige una fecha y hora futuras" }, { status: 400 });
    }

    // Revalida contra el horario de atención real — no basta con que
    // el navegador haya dejado armar ese datetime, alguien podría
    // mandar cualquier timestamp directo a la API.
    const { diaSemana, horaMinuto } = horaYDiaEnMexico(fecha);
    if (!horariosDelDia(diaSemana).includes(horaMinuto)) {
      return NextResponse.json({ error: "ese horario no está dentro del horario de atención" }, { status: 400 });
    }


    const folio = await generarFolio();
    const historialToken = generarHistorialToken();

    const { rows: pacienteRows } = await query(
      `INSERT INTO pacientes (nombre, telefono, folio, historial_token, aviso_privacidad_aceptado_en)
       VALUES ($1, $2, $3, $4, now())
       RETURNING ${PACIENTE_COLUMNAS}`,
      [nombre.trim(), telefono.trim(), folio, historialToken]
    );
    const paciente = pacienteRows[0];

    await query(
      `INSERT INTO paciente_dientes (paciente_id, numero_fdi, estado)
       SELECT $1, unnest($2::int[]), 'sano'
       ON CONFLICT (paciente_id, numero_fdi) DO NOTHING`,
      [paciente.id, NUMEROS_FDI]
    );

    // Apartado atómico del horario: inserta la cita solo si ese horario
    // sigue libre, en una sola operación. Así dos solicitudes simultáneas
    // no pueden quedarse ambas con el mismo hueco (condición de carrera).
    const { rows: citaRows } = await query(
      `INSERT INTO citas (paciente_id, tratamiento, fecha_hora, estado, pendiente_aprobacion)
       SELECT $1, $2, $3, 'agendada', true
       WHERE NOT EXISTS (SELECT 1 FROM citas WHERE estado != 'cancelada' AND fecha_hora = $3)
       RETURNING id, fecha_hora`,
      [paciente.id, tratamiento, fecha.toISOString()]
    );
    if (citaRows.length === 0) {
      // Otro paciente tomó el horario entre la validación y el insert:
      // se deshace el alta recién creada y se pide elegir otro.
      await query(`DELETE FROM pacientes WHERE id = $1`, [paciente.id]);
      return NextResponse.json({ error: "ese horario ya no está disponible, elige otro" }, { status: 409 });
    }

    try {
      const fechaTexto = fecha.toLocaleDateString("es-MX", {
        timeZone: "America/Mexico_City",
        day: "numeric",
        month: "long",
      });
      const horaTexto = fecha.toLocaleTimeString("es-MX", {
        timeZone: "America/Mexico_City",
        hour: "numeric",
        minute: "2-digit",
      });
      await enviarWhatsApp(telefono.trim(), mensajeSolicitudCita(nombre.trim(), fechaTexto, horaTexto));
    } catch (err) {
      console.error("[agendar] no se pudo avisar por WhatsApp:", err);
    }

    return NextResponse.json({ ok: true, cita: citaRows[0] }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
