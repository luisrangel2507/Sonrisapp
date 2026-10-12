import { NextRequest, NextResponse } from "next/server";
import { enviarAvisos2hAntes, enviarRecordatoriosHoraAntes } from "@/lib/cron/recordatorios";
import { autorizadoParaCron } from "@/lib/cron-auth";

// Disparado cada 10-15 minutos por el scheduler de Railway (o un cron
// externo) — manda el recordatorio de "tu cita es en 1 hora".
// Protegido con CRON_SECRET para que no cualquiera pueda invocarlo.
export async function POST(req: NextRequest) {
  if (!autorizadoParaCron(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const [resultado, avisos] = await Promise.all([enviarRecordatoriosHoraAntes(), enviarAvisos2hAntes()]);
  return NextResponse.json({ ok: true, ...resultado, ...avisos });
}
