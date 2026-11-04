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
    const email = (req.nextUrl.searchParams.get("email") ?? "").slice(0, 160);
    const fechaNacimiento = (req.nextUrl.searchParams.get("fecha") ?? "").slice(0, 10);
    const excluir = Number(req.nextUrl.searchParams.get("excluir") ?? 0);
    return NextResponse.json({
      parecidos: await buscarParecidos(nombre, telefono, {
        email,
        curp: (req.nextUrl.searchParams.get("curp") ?? "").slice(0, 18),
        fechaNacimiento,
        excluirId: Number.isInteger(excluir) ? excluir : 0,
      }),
    });
  } catch (err) {
    return errorJson(err);
  }
}
