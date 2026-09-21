import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { enviarWhatsApp, mensajeMetaAlcanzada } from "@/lib/whatsapp";

// Suma puntos a la tarjeta de lealtad de este paciente por haber
// referido a alguien — es la única forma de ganar puntos ahora (antes
// también se daban por visita completada, ver /api/citas).
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const puntos = Number(body?.puntos);
    if (!Number.isFinite(puntos) || puntos <= 0) {
      return NextResponse.json({ error: "puntos debe ser un número mayor a 0" }, { status: 400 });
    }

    const { rows } = await query<{
      id: number;
      nombre: string;
      telefono: string | null;
      puntos: number;
      meta_premio: number;
      premio_actual: string | null;
    }>(
      `UPDATE pacientes SET puntos = puntos + $2 WHERE id = $1
       RETURNING id, nombre, telefono, puntos, meta_premio, premio_actual`,
      [pacienteId, puntos]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }
    const paciente = rows[0];

    const yaAlcanzoLaMeta = paciente.puntos - puntos < paciente.meta_premio;
    if (yaAlcanzoLaMeta && paciente.puntos >= paciente.meta_premio) {
      await query(`UPDATE pacientes SET ultimo_aviso_meta_en = now() WHERE id = $1`, [paciente.id]);
      if (paciente.telefono) {
        await enviarWhatsApp(
          paciente.telefono,
          mensajeMetaAlcanzada(paciente.nombre, paciente.premio_actual ?? "tu recompensa")
        );
      }
    }

    return NextResponse.json({ paciente });
  } catch (err) {
    return errorJson(err);
  }
}
