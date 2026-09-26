import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { asegurarHistorialToken, generarHistorialToken } from "@/lib/historial-token";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const token = await asegurarHistorialToken(id);
    return NextResponse.json({ token });
  } catch (err) {
    return errorJson(err);
  }
}

// Este token no expira solo (da acceso permanente a /formulario y
// /portal del paciente), así que si se comparte por error o queda en
// un dispositivo perdido, la única forma de invalidarlo es rotarlo: el
// link viejo deja de servir en cuanto se genera uno nuevo.
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const token = generarHistorialToken();
    const { rowCount } = await query(`UPDATE pacientes SET historial_token = $2 WHERE id = $1`, [id, token]);
    if (rowCount === 0) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ token });
  } catch (err) {
    return errorJson(err);
  }
}
