import { NextRequest, NextResponse } from "next/server";
import { identidadDesdeRequest } from "@/lib/auth";
import { guardarTotp, leerTotp, nuevoSecretoTotp, uriTotp, verificarCodigoTotp } from "@/lib/totp";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Estado de la verificación en dos pasos de quien tiene la sesión.
export async function GET(req: NextRequest) {
  try {
    const identidad = await identidadDesdeRequest(req);
    const { secreto } = await leerTotp(identidad.usuarioId);
    return NextResponse.json({ activo: Boolean(secreto) });
  } catch (err) {
    return errorJson(err);
  }
}

// accion: "iniciar" (genera la clave), "confirmar" (la activa con un código)
// o "desactivar" (pide un código vigente).
export async function POST(req: NextRequest) {
  try {
    const identidad = await identidadDesdeRequest(req);
    const body = await req.json().catch(() => ({}));
    const accion = body?.accion;
    const codigo = typeof body?.codigo === "string" ? body.codigo : "";
    const { secreto, pendiente } = await leerTotp(identidad.usuarioId);

    if (accion === "iniciar") {
      const nuevo = nuevoSecretoTotp();
      await guardarTotp(identidad.usuarioId, { pendiente: nuevo });
      return NextResponse.json({ secreto: nuevo, uri: uriTotp(nuevo, identidad.nombre) });
    }
    if (accion === "confirmar") {
      if (!pendiente || !verificarCodigoTotp(pendiente, codigo)) {
        return NextResponse.json({ error: "Código incorrecto. Revisa que la hora del celular sea automática." }, { status: 400 });
      }
      await guardarTotp(identidad.usuarioId, { secreto: pendiente, pendiente: null });
      return NextResponse.json({ activo: true });
    }
    if (accion === "desactivar") {
      if (!secreto || !verificarCodigoTotp(secreto, codigo)) {
        return NextResponse.json({ error: "Código incorrecto." }, { status: 400 });
      }
      await guardarTotp(identidad.usuarioId, { secreto: null, pendiente: null });
      return NextResponse.json({ activo: false });
    }
    return NextResponse.json({ error: "acción inválida" }, { status: 400 });
  } catch (err) {
    return errorJson(err);
  }
}
