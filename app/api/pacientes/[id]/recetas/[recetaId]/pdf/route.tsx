import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { descifrar } from "@/lib/crypto";
import { construirRecetaPdfDocumento } from "@/lib/pdf/receta";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string; recetaId: string }> }
) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    const recetaId = Number(params.recetaId);
    if (!Number.isInteger(pacienteId) || !Number.isInteger(recetaId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows: recetaRows } = await query<{
      id: number;
      fecha: string;
      diagnostico: string | null;
      medicamentos: string;
      indicaciones: string | null;
      peso: string | null;
      vigente: boolean;
      motivo_anulacion: string | null;
      anulado_por_nombre: string | null;
    }>(
      `SELECT id, fecha, diagnostico, medicamentos, indicaciones, peso, vigente, motivo_anulacion, anulado_por_nombre
       FROM recetas WHERE id = $1 AND paciente_id = $2`,
      [recetaId, pacienteId]
    );
    if (recetaRows.length === 0) {
      return NextResponse.json({ error: "receta no encontrada" }, { status: 404 });
    }
    const receta = {
      ...recetaRows[0],
      diagnostico: descifrar(recetaRows[0].diagnostico),
      medicamentos: descifrar(recetaRows[0].medicamentos)!,
      indicaciones: descifrar(recetaRows[0].indicaciones),
      peso: descifrar(recetaRows[0].peso),
    };

    const { rows: pacienteRows } = await query<{ nombre: string; folio: string | null; fecha_nacimiento: string | null }>(
      `SELECT nombre, folio, fecha_nacimiento FROM pacientes WHERE id = $1`,
      [pacienteId]
    );
    if (pacienteRows.length === 0) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }
    const paciente = pacienteRows[0];

    const documento = construirRecetaPdfDocumento(receta, paciente);

    const buffer = await renderToBuffer(documento);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receta-${paciente.folio ?? pacienteId}-${recetaId}.pdf"`,
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
