import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";

// Solo un admin puede quitar usuarios.
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const identidad = await identidadDesdeRequest(req);
    if (identidad.rol !== "admin") {
      return NextResponse.json({ error: "solo un administrador puede quitar usuarios" }, { status: 403 });
    }

    const { rowCount } = await query(`DELETE FROM usuarios WHERE id = $1`, [id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: "usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
