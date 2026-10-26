import { NextRequest, NextResponse } from "next/server";
import { identidadDesdeRequest } from "@/lib/auth";
import { generarRespaldoJson } from "@/lib/respaldo";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Descarga manual del respaldo completo (solo administradores).
export async function GET(req: NextRequest) {
  try {
    const identidad = await identidadDesdeRequest(req);
    if (identidad.rol !== "admin") {
      return NextResponse.json({ error: "solo un administrador puede descargar el respaldo" }, { status: 403 });
    }
    const gz = await generarRespaldoJson();
    const fecha = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(gz), {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="respaldo-sonrisapp-${fecha}.json.gz"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
