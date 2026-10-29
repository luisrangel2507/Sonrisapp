import { NextRequest, NextResponse } from "next/server";
import { buscarParecidos } from "@/lib/duplicados";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// ¿Ya existe un paciente así? Se consulta mientras se escribe el nombre o
// el teléfono en el alta de paciente.
export async function GET(req: NextRequest) {
  try {
    const nombre = (req.nextUrl.searchParams.get("nombre") ?? "").slice(0, 160);
    const telefono = (req.nextUrl.searchParams.get("telefono") ?? "").slice(0, 30);
    return NextResponse.json({ parecidos: await buscarParecidos(nombre, telefono) });
  } catch (err) {
    return errorJson(err);
  }
}
