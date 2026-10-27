import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { identidadDesdeRequest } from "@/lib/auth";
import { errorJson } from "@/lib/api-error";

// Invalida todas las TVs vinculadas (por si se cambia o se pierde una).
export async function POST(req: NextRequest) {
  try {
    const identidad = await identidadDesdeRequest(req);
    if (identidad.rol !== "admin") {
      return NextResponse.json({ error: "solo un administrador puede desvincular TVs" }, { status: 403 });
    }
    await query(`UPDATE pantalla_tv SET tv_version = tv_version + 1 WHERE id = 1`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
