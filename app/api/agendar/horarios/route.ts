import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Ruta pública (fuera del middleware de sesión): dado un puñado de
// horarios candidatos (ya calculados por el cliente con horariosDelDia,
// como timestamps ISO absolutos), regresa cuáles ya están ocupados —
// así /agendar solo deja elegir horarios realmente libres. Comparar por
// igualdad de timestamp evita cualquier lío de zona horaria entre el
// navegador del visitante y el servidor.
export async function GET(req: NextRequest) {
  try {
    const slotsParam = req.nextUrl.searchParams.get("slots");
    const slots = (slotsParam ?? "").split(",").filter(Boolean).slice(0, 100);
    if (slots.length === 0) {
      return NextResponse.json({ ocupados: [] });
    }

    const { rows } = await query<{ fecha_hora: string }>(
      `SELECT fecha_hora FROM citas WHERE estado != 'cancelada' AND fecha_hora = ANY($1::timestamptz[])`,
      [slots]
    );

    return NextResponse.json({ ocupados: rows.map((r) => new Date(r.fecha_hora).toISOString()) });
  } catch (err) {
    return errorJson(err);
  }
}
