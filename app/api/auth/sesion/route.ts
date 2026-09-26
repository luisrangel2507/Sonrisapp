import { NextRequest, NextResponse } from "next/server";
import { identidadDesdeRequest } from "@/lib/auth";
import { errorJson } from "@/lib/api-error";

// Quién soy — para que el panel pueda ocultar acciones de admin
// (dar de alta/quitar usuarios, dar de baja pacientes) cuando quien
// entró es un asistente, sin depender solo de que el servidor las rechace.
export async function GET(req: NextRequest) {
  try {
    const identidad = await identidadDesdeRequest(req);
    return NextResponse.json({ nombre: identidad.nombre, rol: identidad.rol });
  } catch (err) {
    return errorJson(err);
  }
}
