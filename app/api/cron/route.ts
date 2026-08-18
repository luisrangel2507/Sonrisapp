import { NextRequest, NextResponse } from "next/server";
import { correrCrmDiario } from "@/lib/cron/crm-diario";

// Disparado por el scheduler de Railway (o un cron externo) una vez al día.
// Protegido con CRON_SECRET para que no cualquiera pueda invocarlo.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const resultado = await correrCrmDiario();
  return NextResponse.json({ ok: true, ...resultado });
}
