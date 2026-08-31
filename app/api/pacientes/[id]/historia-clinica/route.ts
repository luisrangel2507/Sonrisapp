import { NextRequest, NextResponse } from "next/server";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";
import { guardarHistoriaClinica, obtenerHistoriaClinicaVigente } from "@/lib/historia-clinica";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const historiaClinica = await obtenerHistoriaClinicaVigente(pacienteId);
    return NextResponse.json({ historiaClinica });
  } catch (err) {
    return errorJson(err);
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const identidad = await identidadDesdeRequest(req);
    const historiaClinica = await guardarHistoriaClinica(pacienteId, body, identidad);

    return NextResponse.json({ historiaClinica });
  } catch (err) {
    return errorJson(err);
  }
}
