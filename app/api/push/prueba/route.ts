import { NextResponse } from "next/server";
import { enviarPush } from "@/lib/push";
import { errorJson } from "@/lib/api-error";

export async function POST() {
  try {
    const { enviados } = await enviarPush(
      "🔔 Notificación de prueba",
      "Si ves esto, las notificaciones están funcionando correctamente."
    );
    if (enviados === 0) {
      return NextResponse.json(
        { error: "No hay notificaciones activas en ningún celular todavía." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, enviados });
  } catch (err) {
    return errorJson(err);
  }
}
