import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; notaId: string } }
) {
  try {
    const pacienteId = Number(params.id);
    const notaId = Number(params.notaId);
    if (!Number.isInteger(pacienteId) || !Number.isInteger(notaId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rowCount } = await query(
      `DELETE FROM paciente_notas WHERE id = $1 AND paciente_id = $2`,
      [notaId, pacienteId]
    );
    if (rowCount === 0) {
      return NextResponse.json({ error: "entrada no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
