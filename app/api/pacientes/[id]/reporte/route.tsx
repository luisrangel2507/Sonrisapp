import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { errorJson } from "@/lib/api-error";
import { DocumentoPdf } from "@/lib/pdf";
import { obtenerDatosReporte, ReporteClinicoPdf } from "@/lib/pdf/reporte-clinico";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const datos = await obtenerDatosReporte(pacienteId);
    if (!datos) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }

    const documento = (
      <DocumentoPdf>
        <ReporteClinicoPdf datos={datos} />
      </DocumentoPdf>
    );

    const buffer = await renderToBuffer(documento);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="reporte-${datos.paciente.folio ?? datos.paciente.id}.pdf"`,
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
