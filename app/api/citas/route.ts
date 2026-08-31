import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { enviarWhatsApp, mensajeMetaAlcanzada, mensajePostConsulta } from "@/lib/whatsapp";
import { errorJson } from "@/lib/api-error";

const PUNTOS_POR_VISITA = 50;

const CITAS_SELECT = `
  SELECT c.id, c.paciente_id, p.nombre AS paciente_nombre, c.tratamiento,
         c.fecha_hora, c.estado, c.monto::float8 AS monto,
         COALESCE(pg.pagado, 0)::float8 AS pagado,
         (hc.confirmado IS FALSE) AS historial_pendiente,
         c.pendiente_aprobacion
  FROM citas c
  JOIN pacientes p ON p.id = c.paciente_id
  LEFT JOIN (
    SELECT cita_id, SUM(monto) AS pagado FROM pagos GROUP BY cita_id
  ) pg ON pg.cita_id = c.id
  LEFT JOIN historia_clinica hc ON hc.paciente_id = c.paciente_id AND hc.vigente = true
`;

export async function GET(req: NextRequest) {
  try {
    const pacienteId = req.nextUrl.searchParams.get("paciente_id");

    const { rows } = pacienteId
      ? await query(`${CITAS_SELECT} WHERE c.paciente_id = $1 ORDER BY c.fecha_hora DESC`, [
          Number(pacienteId),
        ])
      : await query(`${CITAS_SELECT} ORDER BY c.fecha_hora DESC`);

    return NextResponse.json({ citas: rows });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paciente_id, tratamiento, fecha_hora, monto } = body ?? {};

    if (!paciente_id || !tratamiento || !fecha_hora) {
      return NextResponse.json(
        { error: "paciente_id, tratamiento y fecha_hora son requeridos" },
        { status: 400 }
      );
    }

    const { rows } = await query<{ id: number }>(
      `INSERT INTO citas (paciente_id, tratamiento, fecha_hora, estado, monto)
       VALUES ($1, $2, $3, 'agendada', $4)
       RETURNING id`,
      [paciente_id, tratamiento, fecha_hora, monto ?? null]
    );

    const { rows: citaRows } = await query(`${CITAS_SELECT} WHERE c.id = $1`, [rows[0].id]);

    return NextResponse.json({ cita: citaRows[0] }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}

// PATCH { id, estado: 'completada' | 'cancelada' }
//   → cambia el estado. Al completar: suma +50 pts al paciente,
//     incrementa visitas_totales y, si cruza la meta configurada,
//     avisa por WhatsApp.
// PATCH { id, tratamiento?, fecha_hora?, monto? }
//   → edita los detalles de la cita, sin tocar el estado ni puntos.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, estado, tratamiento, fecha_hora, monto, pendiente_aprobacion } = body ?? {};

    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    }

    if (estado === undefined) {
      const asignaciones: string[] = [];
      const valores: unknown[] = [];
      let idx = 2;
      if (tratamiento !== undefined) {
        asignaciones.push(`tratamiento = $${idx++}`);
        valores.push(tratamiento);
      }
      if (fecha_hora !== undefined) {
        asignaciones.push(`fecha_hora = $${idx++}`);
        valores.push(fecha_hora);
      }
      if (monto !== undefined) {
        asignaciones.push(`monto = $${idx++}`);
        valores.push(monto === "" || monto === null ? null : Number(monto));
      }
      if (pendiente_aprobacion !== undefined) {
        asignaciones.push(`pendiente_aprobacion = $${idx++}`);
        valores.push(Boolean(pendiente_aprobacion));
      }

      if (asignaciones.length === 0) {
        return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
      }

      const { rows } = await query(
        `UPDATE citas SET ${asignaciones.join(", ")} WHERE id = $1 RETURNING id`,
        [id, ...valores]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: "cita no encontrada" }, { status: 404 });
      }

      const { rows: citaActualizada } = await query(`${CITAS_SELECT} WHERE c.id = $1`, [id]);
      return NextResponse.json({ cita: citaActualizada[0] });
    }

    if (estado !== "completada" && estado !== "cancelada") {
      return NextResponse.json(
        { error: "estado debe ser 'completada' o 'cancelada'" },
        { status: 400 }
      );
    }

    const { rows: citaRows } = await query<{
      id: number;
      paciente_id: number;
      estado: string;
      tratamiento: string;
      monto: number | null;
    }>(
      `SELECT id, paciente_id, estado, tratamiento, monto::float8 AS monto FROM citas WHERE id = $1`,
      [id]
    );
    const cita = citaRows[0];
    if (!cita) {
      return NextResponse.json({ error: "cita no encontrada" }, { status: 404 });
    }
    if (cita.estado === estado) {
      const { rows } = await query(`${CITAS_SELECT} WHERE c.id = $1`, [id]);
      return NextResponse.json({ cita: rows[0] });
    }

    if (estado === "cancelada") {
      await query(`UPDATE citas SET estado = 'cancelada' WHERE id = $1`, [id]);
      const { rows } = await query(`${CITAS_SELECT} WHERE c.id = $1`, [id]);
      return NextResponse.json({ cita: rows[0] });
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

    if (paciente.telefono) {
      const { rows: pagoRows } = await query<{ pagado: number }>(
        `SELECT COALESCE(SUM(monto), 0)::float8 AS pagado FROM pagos WHERE cita_id = $1`,
        [id]
      );
      const pagado = pagoRows[0]?.pagado ?? 0;
      const saldoPendiente = cita.monto != null ? Math.max(0, cita.monto - pagado) : 0;
      await enviarWhatsApp(
        paciente.telefono,
        mensajePostConsulta(paciente.nombre, cita.tratamiento, saldoPendiente)
      );
    }

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

    const { rows: citaActualizada } = await query(`${CITAS_SELECT} WHERE c.id = $1`, [id]);

    return NextResponse.json({ cita: citaActualizada[0], paciente });
  } catch (err) {
    return errorJson(err);
  }
}
