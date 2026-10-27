import { NextRequest, NextResponse } from "next/server";
import { crearTokenTv, identidadDesdeRequest } from "@/lib/auth";
import { versionTv } from "@/lib/tv";
import { errorJson } from "@/lib/api-error";

// Genera la clave para vincular una TV (solo admin). La clave va en el
// link /tv?clave=… que se abre una vez en la TV.
export async function POST(req: NextRequest) {
  try {
    const identidad = await identidadDesdeRequest(req);
    if (identidad.rol !== "admin") {
      return NextResponse.json({ error: "solo un administrador puede vincular una TV" }, { status: 403 });
    }
    return NextResponse.json({ clave: await crearTokenTv(await versionTv()) });
  } catch (err) {
    return errorJson(err);
  }
}
