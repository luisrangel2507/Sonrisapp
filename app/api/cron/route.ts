import { NextRequest, NextResponse } from "next/server";
import { correrCrmDiario } from "@/lib/cron/crm-diario";
import { enviarResumenDiario } from "@/lib/cron/recordatorios";
import { autorizadoParaCron } from "@/lib/cron-auth";
import { query } from "@/lib/db";
import { avisarStockBajo } from "@/lib/cron/inventario";

// Disparado por el scheduler de Railway (o un cron externo) una vez al
// día, idealmente a las 8am hora de México — felicitaciones de
// cumpleaños + resumen de las citas de hoy por paciente.
// Protegido con CRON_SECRET para que no cualquiera pueda invocarlo.
export async function POST(req: NextRequest) {
  if (!autorizadoParaCron(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const [cumpleanos, resumenHoy, inventario] = await Promise.all([
    correrCrmDiario(),
    enviarResumenDiario(),
    avisarStockBajo().catch((e) => ({ error: String(e) })),
  ]);
  // Limpieza: contadores de límite de intentos de días anteriores.
  await query(`DELETE FROM limites_publicos WHERE ventana_inicio < now() - interval '1 day'`);
  return NextResponse.json({ ok: true, cumpleanos, resumenHoy, inventario });
}
