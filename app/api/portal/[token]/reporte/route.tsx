import { NextRequest, NextResponse } from "next/server";
import { limitarPublico } from "@/lib/limite-publico";
import { renderToBuffer } from "@react-pdf/renderer";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { DocumentoPdf } from "@/lib/pdf";
import { obtenerDatosReporte, ReporteClinicoPdf } from "@/lib/pdf/reporte-clinico";
import { registrarAcceso } from "@/lib/bitacora";

// Derecho de acceso (ARCO/NOM-024): el paciente puede descargar su
// propio expediente completo en PDF desde su portal, sin depender de
// pedírselo a la clínica — mismo documento que usa la doctora
// internamente (lib/pdf/reporte-clinico.tsx), solo que aquí se llega
// por historial_token en vez de sesión.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const limitado = await limitarPublico(req, "lectura-publica", 300, 60);
  if (limitado) return limitado;
  const params = await props.params;
  try {
    const { rows } = await query<{ id: number }>(`SELECT id FROM pacientes WHERE historial_token = $1 AND historial_token_expira_en > now()`, [
      params.token,
    ]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }

    const datos = await obtenerDatosReporte(rows[0].id);
    if (!datos) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }

    void registrarAcceso(rows[0].id, "portal", null);

    const documento = (
      <DocumentoPdf>
        <ReporteClinicoPdf datos={datos} />
      </DocumentoPdf>
    );

    const buffer = await renderToBuffer(documento);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="mi-expediente-${datos.paciente.folio ?? datos.paciente.id}.pdf"`,
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
