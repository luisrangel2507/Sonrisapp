import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, Text, View } from "@react-pdf/renderer";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { DocumentoPdf, PaginaPdf, EncabezadoPdf, estilosPdf, PDF_COLOR } from "@/lib/pdf";
import { formatearDinero } from "@/lib/dinero";

export const dynamic = "force-dynamic";

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

function formatearFecha(f: string) {
  return new Date(f).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

function formatearFechaHora(f: string) {
  return new Date(f).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const citaId = Number(params.id);
    if (!Number.isInteger(citaId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows: citaRows } = await query<{
      id: number;
      paciente_nombre: string;
      paciente_folio: string | null;
      tratamiento: string;
      fecha_hora: string;
      monto: number | null;
    }>(
      `SELECT c.id, p.nombre AS paciente_nombre, p.folio AS paciente_folio, c.tratamiento,
              c.fecha_hora, c.monto::float8 AS monto
       FROM citas c JOIN pacientes p ON p.id = c.paciente_id WHERE c.id = $1`,
      [citaId]
    );
    if (citaRows.length === 0) {
      return NextResponse.json({ error: "cita no encontrada" }, { status: 404 });
    }
    const cita = citaRows[0];

    const { rows: pagos } = await query<{
      id: number;
      monto: number;
      metodo: string;
      fecha: string;
      nota: string | null;
    }>(
      `SELECT id, monto::float8 AS monto, metodo, fecha, nota FROM pagos WHERE cita_id = $1 ORDER BY fecha ASC`,
      [citaId]
    );

    if (pagos.length === 0) {
      return NextResponse.json({ error: "esta cita no tiene pagos registrados" }, { status: 404 });
    }

    const total = pagos.reduce((s, p) => s + p.monto, 0);

    const documento = (
      <DocumentoPdf>
        <PaginaPdf>
          <EncabezadoPdf titulo="Recibo de pago" />

          <View style={estilosPdf.seccion}>
            <View style={estilosPdf.filaDatos}>
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Paciente</Text>
                <Text style={estilosPdf.datoValor}>{cita.paciente_nombre}</Text>
              </View>
              {cita.paciente_folio && (
                <View style={estilosPdf.dato}>
                  <Text style={estilosPdf.datoLabel}>Folio</Text>
                  <Text style={estilosPdf.datoValor}>{cita.paciente_folio}</Text>
                </View>
              )}
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Tratamiento</Text>
                <Text style={estilosPdf.datoValor}>{cita.tratamiento}</Text>
              </View>
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Fecha de la cita</Text>
                <Text style={estilosPdf.datoValor}>{formatearFecha(cita.fecha_hora)}</Text>
              </View>
            </View>
          </View>

          <View style={estilosPdf.seccion}>
            <Text style={estilosPdf.seccionTitulo}>Pagos registrados</Text>
            <View style={estilosPdf.tabla}>
              <View style={estilosPdf.filaTablaHead}>
                <Text style={{ ...estilosPdf.celdaHead, width: "40%" }}>Fecha</Text>
                <Text style={{ ...estilosPdf.celdaHead, width: "30%" }}>Método</Text>
                <Text style={{ ...estilosPdf.celdaHead, width: "30%", textAlign: "right" }}>Monto</Text>
              </View>
              {pagos.map((p) => (
                <View key={p.id} style={estilosPdf.filaTabla}>
                  <Text style={{ ...estilosPdf.celda, width: "40%" }}>{formatearFechaHora(p.fecha)}</Text>
                  <Text style={{ ...estilosPdf.celda, width: "30%" }}>{METODO_LABEL[p.metodo] ?? p.metodo}</Text>
                  <Text style={{ ...estilosPdf.celda, width: "30%", textAlign: "right" }}>
                    {formatearDinero(p.monto)}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
              <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: PDF_COLOR.rose }}>
                Total pagado: {formatearDinero(total)}
              </Text>
            </View>
            {cita.monto != null && cita.monto > total && (
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 3 }}>
                <Text style={{ fontSize: 9, color: PDF_COLOR.muted }}>
                  Saldo pendiente: {formatearDinero(cita.monto - total)} de {formatearDinero(cita.monto)}
                </Text>
              </View>
            )}
          </View>
        </PaginaPdf>
      </DocumentoPdf>
    );

    const buffer = await renderToBuffer(documento);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recibo-cita-${citaId}.pdf"`,
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
