import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string; consentId: string }> }
) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    const consentId = Number(params.consentId);
    if (!Number.isInteger(pacienteId) || !Number.isInteger(consentId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rowCount } = await query(
      `DELETE FROM consentimientos WHERE id = $1 AND paciente_id = $2`,
      [consentId, pacienteId]
    );
    if (rowCount === 0) {
      return NextResponse.json({ error: "consentimiento no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
