import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { descifrar } from "@/lib/crypto";

const CAMPOS_CIFRABLES = ["mensaje", "respuesta"] as const;

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows } = await query(
      `SELECT id, paciente_id, mensaje, estado, respuesta, resuelta_por_nombre, resuelta_en, creado_en
       FROM solicitudes_paciente WHERE paciente_id = $1 ORDER BY creado_en DESC`,
      [pacienteId]
    );

    const solicitudes = rows.map((fila) => {
      const copia = { ...fila };
      for (const campo of CAMPOS_CIFRABLES) copia[campo] = descifrar(copia[campo]);
      return copia;
    });

    return NextResponse.json({ solicitudes });
  } catch (err) {
    return errorJson(err);
  }
}
