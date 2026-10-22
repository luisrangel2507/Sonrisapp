import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const MODOS = ["espera", "bienvenida", "gracias"];

// Lo que se muestra en la TV: primero lo que se eligió a mano (vale 10
// minutos); si no hay nada, se arma solo con la agenda de hoy — bienvenida
// al paciente que sigue con cita agendada y, si ya no queda ninguno,
// agradecimiento al último que se atendió.
export async function GET() {
  try {
    const { rows } = await query<{ modo: string; nombre: string | null; vigente: boolean }>(
      `SELECT modo, nombre, (actualizado_en > now() - interval '10 minutes') AS vigente FROM pantalla_tv WHERE id = 1`
    );
    const manual = rows[0];
    if (manual && manual.modo !== "espera" && manual.vigente && manual.nombre) {
      return NextResponse.json({ modo: manual.modo, nombres: [manual.nombre], origen: "manual" });
    }

    const hoy = `(c.fecha_hora AT TIME ZONE 'America/Mexico_City')::date = (now() AT TIME ZONE 'America/Mexico_City')::date`;
    const { rows: agendadas } = await query<{ nombre: string }>(
      `SELECT p.nombre FROM citas c JOIN pacientes p ON p.id = c.paciente_id
       WHERE c.estado = 'agendada' AND c.pendiente_aprobacion IS NOT TRUE AND ${hoy}
       ORDER BY c.fecha_hora LIMIT 1`
    );
    if (agendadas[0]) {
      return NextResponse.json({ modo: "bienvenida", nombres: [agendadas[0].nombre], origen: "agenda" });
    }
    const { rows: atendidas } = await query<{ nombre: string }>(
      `SELECT p.nombre FROM citas c JOIN pacientes p ON p.id = c.paciente_id
       WHERE c.estado = 'completada' AND ${hoy}
       ORDER BY c.fecha_hora DESC LIMIT 1`
    );
    if (atendidas[0]) {
      return NextResponse.json({ modo: "gracias", nombres: [atendidas[0].nombre], origen: "agenda" });
    }
    return NextResponse.json({ modo: "espera", nombres: [], origen: "agenda" });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const modo = typeof body?.modo === "string" ? body.modo : "";
    if (!MODOS.includes(modo)) {
      return NextResponse.json({ error: "modo inválido" }, { status: 400 });
    }
    const nombre = typeof body?.nombre === "string" ? body.nombre.trim().slice(0, 80) : "";
    if (modo !== "espera" && !nombre) {
      return NextResponse.json({ error: "falta el nombre" }, { status: 400 });
    }
    await query(
      `INSERT INTO pantalla_tv (id, modo, nombre, actualizado_en) VALUES (1, $1, $2, now())
       ON CONFLICT (id) DO UPDATE SET modo = $1, nombre = $2, actualizado_en = now()`,
      [modo, modo === "espera" ? null : nombre]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
