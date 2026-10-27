import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { COOKIE_SESION, COOKIE_TV, verificarSesionToken, verificarTokenTv } from "@/lib/auth";
import { estadoTv, versionTv } from "@/lib/tv";

export const dynamic = "force-dynamic";

const MODOS = ["espera", "bienvenida", "gracias"];

// Lo que se muestra en la TV: primero lo que se eligió a mano (vale 10
// minutos); si no hay nada, se arma solo con la agenda de hoy — bienvenida
// al paciente que sigue con cita agendada y, si ya no queda ninguno,
// agradecimiento al último que se atendió.
export async function GET(req: NextRequest) {
  try {
    // Sin sesión del panel, la TV debe traer una clave vigente (no
    // desvinculada).
    if (!(await verificarSesionToken(req.cookies.get(COOKIE_SESION)?.value))) {
      const tv = await verificarTokenTv(req.cookies.get(COOKIE_TV)?.value);
      if (!tv || tv.v !== (await versionTv())) {
        return NextResponse.json({ error: "no autenticado" }, { status: 401 });
      }
    }
    return NextResponse.json(await estadoTv());
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const modo = typeof body?.modo === "string" ? body.modo : "";
    if (!MODOS.includes(modo)) {
      return NextResponse.json({ error: "modo inválido" }, { status: 400 });
    }
    const nombre = typeof body?.nombre === "string" ? body.nombre.trim().slice(0, 80) : "";
    if (modo !== "espera" && !nombre) {
      return NextResponse.json({ error: "falta el nombre" }, { status: 400 });
    }
    const hora = typeof body?.hora === "string" && /^\d{1,2}:\d{2}$/.test(body.hora) ? body.hora : null;
    await query(
      `INSERT INTO pantalla_tv (id, modo, nombre, hora, actualizado_en) VALUES (1, $1, $2, $3, now())
       ON CONFLICT (id) DO UPDATE SET modo = $1, nombre = $2, hora = $3, actualizado_en = now()`,
      [modo, modo === "espera" ? null : nombre, modo === "espera" ? null : hora]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
