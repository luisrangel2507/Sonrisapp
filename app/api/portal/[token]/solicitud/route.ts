import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { cifrar } from "@/lib/crypto";

// Derechos de rectificación/cancelación/oposición (ARCO/NOM-024): el
// paciente manda una solicitud desde su portal (pedir corrección de un
// dato, oponerse a algo, etc.) y queda registrada para que la doctora
// la resuelva desde el expediente — en vez de perderse en un mensaje
// de WhatsApp suelto.
export const dynamic = "force-dynamic";

const MENSAJE_MAX = 2000;

export async function POST(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json().catch(() => ({}));
    const mensaje = typeof body?.mensaje === "string" ? body.mensaje.trim() : "";
    if (!mensaje) {
      return NextResponse.json({ error: "escribe tu solicitud" }, { status: 400 });
    }
    if (mensaje.length > MENSAJE_MAX) {
      return NextResponse.json({ error: "el mensaje es demasiado largo" }, { status: 400 });
    }

    const { rows } = await query<{ id: number }>(`SELECT id FROM pacientes WHERE historial_token = $1`, [
      params.token,
    ]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }

    await query(`INSERT INTO solicitudes_paciente (paciente_id, mensaje) VALUES ($1, $2)`, [
      rows[0].id,
      cifrar(mensaje),
    ]);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
