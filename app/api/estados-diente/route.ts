import { NextRequest, NextResponse } from "next/server";
import { errorJson } from "@/lib/api-error";
import { estadosPersonalizados, crearEstadoPersonalizado } from "@/lib/estados-diente";

export async function GET() {
  try {
    const estados = await estadosPersonalizados();
    return NextResponse.json({ estados });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { etiqueta } = body ?? {};

    if (!etiqueta || typeof etiqueta !== "string" || !etiqueta.trim()) {
      return NextResponse.json({ error: "etiqueta es requerida" }, { status: 400 });
    }
    if (etiqueta.trim().length > 60) {
      return NextResponse.json({ error: "el nombre es demasiado largo" }, { status: 400 });
    }

    const estado = await crearEstadoPersonalizado(etiqueta.trim());
    return NextResponse.json({ estado }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
