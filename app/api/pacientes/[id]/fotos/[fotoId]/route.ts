import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { descifrar } from "@/lib/crypto";

type Props = { params: Promise<{ id: string; fotoId: string }> };

// Imagen completa de una foto.
export async function GET(_req: NextRequest, props: Props) {
  const params = await props.params;
  try {
    const { rows } = await query<{ imagen: string }>(
      `SELECT imagen FROM paciente_fotos WHERE id = $1 AND paciente_id = $2 AND vigente`,
      [Number(params.fotoId), Number(params.id)]
    );
    if (!rows[0]) return NextResponse.json({ error: "foto no encontrada" }, { status: 404 });
    return NextResponse.json({ imagen: descifrar(rows[0].imagen) });
  } catch (err) {
    return errorJson(err);
  }
}

// Quitar una foto: no se borra, se marca como no vigente con su motivo.
export async function DELETE(req: NextRequest, props: Props) {
  const params = await props.params;
  try {
    const body = await req.json().catch(() => ({}));
    const motivo = typeof body?.motivo === "string" && body.motivo.trim() ? body.motivo.trim().slice(0, 300) : "Quitada";
    await query(
      `UPDATE paciente_fotos SET vigente = false, motivo_anulacion = $3 WHERE id = $1 AND paciente_id = $2`,
      [Number(params.fotoId), Number(params.id), motivo]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
