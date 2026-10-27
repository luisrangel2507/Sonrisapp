import { NextResponse } from "next/server";
import { obtenerMarca } from "@/lib/marca";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Marca de la clínica para pintar nombre, logo y color en todas las
// pantallas (incluidas las públicas). No expone datos privados.
export async function GET() {
  try {
    return NextResponse.json(await obtenerMarca());
  } catch (err) {
    return errorJson(err);
  }
}
