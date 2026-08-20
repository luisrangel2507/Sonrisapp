import { NextRequest, NextResponse } from "next/server";
import { correrCrmDiario } from "@/lib/cron/crm-diario";
import { enviarResumenDiario } from "@/lib/cron/recordatorios";

// Disparado por el scheduler de Railway (o un cron externo) una vez al
// día, idealmente a las 8am hora de México — felicitaciones de
// cumpleaños + resumen de las citas de hoy por paciente.
// Protegido con CRON_SECRET para que no cualquiera pueda invocarlo.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const [cumpleanos, resumenHoy] = await Promise.all([correrCrmDiario(), enviarResumenDiario()]);
  return NextResponse.json({ ok: true, cumpleanos, resumenHoy });
}
