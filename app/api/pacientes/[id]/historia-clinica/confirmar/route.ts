import { NextRequest, NextResponse } from "next/server";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";
import { confirmarHistoriaClinica } from "@/lib/historia-clinica";

// La doctora revisó el historial que llenó el paciente y está todo
// correcto tal cual — se marca confirmado sin tener que reescribir
// nada. Si algo estuviera mal, lo corrige en el formulario normal
// (PUT /historia-clinica), que ya confirma automáticamente al guardar.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const identidad = await identidadDesdeRequest(req);
    const historiaClinica = await confirmarHistoriaClinica(pacienteId, identidad);

    if (!historiaClinica) {
      return NextResponse.json({ error: "sin historia clínica registrada" }, { status: 404 });
    }

    return NextResponse.json({ historiaClinica });
  } catch (err) {
    return errorJson(err);
  }
}
