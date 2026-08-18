import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { enviarWhatsApp, mensajeMetaAlcanzada } from "@/lib/whatsapp";

const PUNTOS_POR_VISITA = 50;

export async function GET(req: NextRequest) {
  const pacienteId = req.nextUrl.searchParams.get("paciente_id");
  const params: unknown[] = [];
  let where = "";
  if (pacienteId) {
    where = "WHERE paciente_id = $1";
    params.push(Number(pacienteId));
  }

  const { rows } = await query(
    `SELECT id, paciente_id, tratamiento, fecha_hora, estado
     FROM citas ${where} ORDER BY fecha_hora DESC`,
    params
  );
  return NextResponse.json({ citas: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { paciente_id, tratamiento, fecha_hora } = body ?? {};

  if (!paciente_id || !tratamiento || !fecha_hora) {
    return NextResponse.json(
      { error: "paciente_id, tratamiento y fecha_hora son requeridos" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `INSERT INTO citas (paciente_id, tratamiento, fecha_hora, estado)
     VALUES ($1, $2, $3, 'agendada')
     RETURNING id, paciente_id, tratamiento, fecha_hora, estado`,
    [paciente_id, tratamiento, fecha_hora]
  );

  return NextResponse.json({ cita: rows[0] }, { status: 201 });
}

// Marca una cita como completada: suma +50 pts al paciente, incrementa
// visitas_totales y, si cruza la meta configurada, avisa por WhatsApp.
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, estado } = body ?? {};

  if (!id || estado !== "completada") {
    return NextResponse.json(
      { error: "id y estado='completada' son requeridos" },
      { status: 400 }
    );
  }

  const { rows: citaRows } = await query<{ id: number; paciente_id: number; estado: string }>(
    `SELECT id, paciente_id, estado FROM citas WHERE id = $1`,
    [id]
  );
  const cita = citaRows[0];
  if (!cita) {
    return NextResponse.json({ error: "cita no encontrada" }, { status: 404 });
  }
  if (cita.estado === "completada") {
    return NextResponse.json({ cita });
  }

  await query(`UPDATE citas SET estado = 'completada' WHERE id = $1`, [id]);

  const { rows: pacienteRows } = await query<{
    id: number;
    nombre: string;
    telefono: string | null;
    puntos: number;
    meta_premio: number;
    premio_actual: string | null;
  }>(
    `UPDATE pacientes
     SET puntos = puntos + $2, visitas_totales = visitas_totales + 1
     WHERE id = $1
     RETURNING id, nombre, telefono, puntos, meta_premio, premio_actual`,
    [cita.paciente_id, PUNTOS_POR_VISITA]
  );

  const paciente = pacienteRows[0];

  const yaAlcanzoLaMeta = paciente.puntos - PUNTOS_POR_VISITA < paciente.meta_premio;
  if (yaAlcanzoLaMeta && paciente.puntos >= paciente.meta_premio) {
    await query(`UPDATE pacientes SET ultimo_aviso_meta_en = now() WHERE id = $1`, [paciente.id]);
    if (paciente.telefono) {
      await enviarWhatsApp(
        paciente.telefono,
        mensajeMetaAlcanzada(paciente.nombre, paciente.premio_actual ?? "tu recompensa")
      );
    }
  }

  return NextResponse.json({ cita: { ...cita, estado: "completada" }, paciente });
}
