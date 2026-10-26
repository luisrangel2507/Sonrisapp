import { NextRequest, NextResponse } from "next/server";
import { autorizadoParaCron } from "@/lib/cron-auth";
import { cifrarRespaldo, generarRespaldoJson, hayClaveRespaldo } from "@/lib/respaldo";

export const dynamic = "force-dynamic";

// Respaldo diario cifrado — lo descarga el workflow de GitHub
// (.github/workflows/respaldo-diario.yml) y lo guarda 30 días.
export async function POST(req: NextRequest) {
  if (!autorizadoParaCron(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!hayClaveRespaldo()) {
    return NextResponse.json({ error: "RESPALDO_KEY no configurada" }, { status: 500 });
  }
  const archivo = cifrarRespaldo(await generarRespaldoJson());
  return new NextResponse(new Uint8Array(archivo), {
    headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" },
  });
}
