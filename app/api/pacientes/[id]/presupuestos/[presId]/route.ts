import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string; presId: string }> }
) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    const presupuestoId = Number(params.presId);
    if (!Number.isInteger(pacienteId) || !Number.isInteger(presupuestoId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rowCount } = await query(
      `DELETE FROM presupuestos WHERE id = $1 AND paciente_id = $2`,
      [presupuestoId, pacienteId]
    );
    if (rowCount === 0) {
      return NextResponse.json({ error: "presupuesto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
