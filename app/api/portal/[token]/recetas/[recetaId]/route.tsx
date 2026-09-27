import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { descifrar } from "@/lib/crypto";
import { construirRecetaPdfDocumento } from "@/lib/pdf/receta";
import { registrarAcceso } from "@/lib/bitacora";

// Link que la doctora puede compartir por WhatsApp para que el
// paciente reciba directamente el PDF de una receta — mismo documento
// que la ruta interna (lib/pdf/receta.tsx), solo que aquí se entra por
// historial_token en vez de sesión. Solo recetas vigentes: una
// anulada no debe circular como si aplicara.
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ token: string; recetaId: string }> }
) {
  const params = await props.params;
  try {
    const recetaId = Number(params.recetaId);
    if (!Number.isInteger(recetaId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows: pacienteRows } = await query<{
      id: number;
      nombre: string;
      folio: string | null;
      fecha_nacimiento: string | null;
    }>(`SELECT id, nombre, folio, fecha_nacimiento FROM pacientes WHERE historial_token = $1`, [params.token]);
    if (pacienteRows.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }
    const paciente = pacienteRows[0];

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
       FROM recetas WHERE id = $1 AND paciente_id = $2 AND vigente = true`,
      [recetaId, paciente.id]
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

    const { rows: perfilRows } = await query<{ telefono: string | null }>(
      `SELECT telefono FROM perfil_dentista WHERE id = 1`
    );
    const telefono = perfilRows[0]?.telefono ?? null;

    void registrarAcceso(paciente.id, "portal", null);

    const documento = construirRecetaPdfDocumento(receta, paciente, telefono);

    const buffer = await renderToBuffer(documento);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receta-${paciente.folio ?? paciente.id}-${recetaId}.pdf"`,
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
