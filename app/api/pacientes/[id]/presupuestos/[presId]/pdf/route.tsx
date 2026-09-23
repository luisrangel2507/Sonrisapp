import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, Text, View } from "@react-pdf/renderer";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { DocumentoPdf, PaginaPdf, EncabezadoPdf, estilosPdf, PDF_COLOR } from "@/lib/pdf";
import { formatearDinero } from "@/lib/dinero";
import { obtenerDatosReporte, ReporteClinicoPdf, formatearFecha } from "@/lib/pdf/reporte-clinico";
import { ARCO_SUPERIOR, ARCO_INFERIOR } from "@/lib/dental";
import type { PresupuestoItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const ARCO_INFERIOR_VISUAL = [...ARCO_INFERIOR].reverse();

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente de respuesta",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

// Mismo mini odontograma seleccionable de la app, redibujado con las
// primitivas de @react-pdf/renderer — solo marca los dientes elegidos,
// sin estado clínico (eso vive en el reporte, páginas siguientes).
function FilaDientesPdf({ numeros, seleccionados }: { numeros: number[]; seleccionados: Set<number> }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center" }}>
      {numeros.map((n) => {
        const activo = seleccionados.has(n);
        return (
          <View
            key={n}
            style={{
              width: 16,
              height: 16,
              marginHorizontal: 2,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: activo ? PDF_COLOR.rose : PDF_COLOR.border,
              backgroundColor: activo ? PDF_COLOR.rose : "#ffffff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 6, color: activo ? "#ffffff" : PDF_COLOR.muted, fontFamily: "Helvetica-Bold" }}>
              {n}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function DientesRelacionadosPdf({ dientes }: { dientes: number[] }) {
  const set = new Set(dientes);
  return (
    <View style={estilosPdf.seccion}>
      <Text style={estilosPdf.seccionTitulo}>Dientes relacionados</Text>
      <FilaDientesPdf numeros={ARCO_SUPERIOR} seleccionados={set} />
      <View style={{ marginTop: 4 }} />
      <FilaDientesPdf numeros={ARCO_INFERIOR_VISUAL} seleccionados={set} />
    </View>
  );
}

// Página del presupuesto — mismo membrete que el reporte clínico, para
// que ambas páginas del documento se vean como una sola unidad.
function PresupuestoPdf({
  presupuesto,
  items,
  pacienteNombre,
}: {
  presupuesto: {
    titulo: string;
    notas: string | null;
    estado: string;
    nombre_respuesta: string | null;
    respondido_en: string | null;
    creado_en: string;
    dientes: number[];
  };
  items: PresupuestoItem[];
  pacienteNombre: string;
}) {
  const total = items.reduce((suma, it) => suma + it.cantidad * it.precio_unitario, 0);

  return (
    <PaginaPdf>
      <EncabezadoPdf titulo="Presupuesto" />

      <View style={estilosPdf.seccion}>
        <Text style={estilosPdf.seccionTitulo}>Datos del paciente</Text>
        <View style={estilosPdf.filaDatos}>
          <View style={estilosPdf.dato}>
            <Text style={estilosPdf.datoLabel}>Nombre</Text>
            <Text style={estilosPdf.datoValor}>{pacienteNombre}</Text>
          </View>
          <View style={estilosPdf.dato}>
            <Text style={estilosPdf.datoLabel}>Fecha</Text>
            <Text style={estilosPdf.datoValor}>{formatearFecha(presupuesto.creado_en)}</Text>
          </View>
        </View>
      </View>

      <View style={estilosPdf.seccion}>
        <Text style={estilosPdf.seccionTitulo}>{presupuesto.titulo}</Text>
        {presupuesto.notas && <Text style={{ ...estilosPdf.parrafo, marginBottom: 8 }}>{presupuesto.notas}</Text>}

        <View style={estilosPdf.tabla}>
          <View style={estilosPdf.filaTablaHead}>
            <Text style={{ ...estilosPdf.celdaHead, width: "52%" }}>Concepto</Text>
            <Text style={{ ...estilosPdf.celdaHead, width: "12%", textAlign: "right" }}>Cant.</Text>
            <Text style={{ ...estilosPdf.celdaHead, width: "18%", textAlign: "right" }}>Precio</Text>
            <Text style={{ ...estilosPdf.celdaHead, width: "18%", textAlign: "right" }}>Importe</Text>
          </View>
          {items.map((it) => (
            <View key={it.id} style={estilosPdf.filaTabla} wrap={false}>
              <Text style={{ ...estilosPdf.celda, width: "52%" }}>{it.concepto}</Text>
              <Text style={{ ...estilosPdf.celda, width: "12%", textAlign: "right" }}>{it.cantidad}</Text>
              <Text style={{ ...estilosPdf.celda, width: "18%", textAlign: "right" }}>
                {formatearDinero(it.precio_unitario)}
              </Text>
              <Text style={{ ...estilosPdf.celda, width: "18%", textAlign: "right" }}>
                {formatearDinero(it.cantidad * it.precio_unitario)}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
          <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: PDF_COLOR.rose }}>
            Total: {formatearDinero(total)}
          </Text>
        </View>
      </View>

      {presupuesto.dientes.length > 0 && <DientesRelacionadosPdf dientes={presupuesto.dientes} />}

      <View style={estilosPdf.seccion}>
        <Text style={estilosPdf.seccionTitulo}>Estado</Text>
        <Text style={estilosPdf.parrafo}>{ETIQUETA_ESTADO[presupuesto.estado] ?? presupuesto.estado}</Text>
        {presupuesto.estado !== "pendiente" && presupuesto.respondido_en && (
          <Text style={{ ...estilosPdf.parrafo, color: PDF_COLOR.muted, marginTop: 2 }}>
            Por {presupuesto.nombre_respuesta} el {formatearFecha(presupuesto.respondido_en)}
          </Text>
        )}
      </View>
    </PaginaPdf>
  );
}

export async function GET(
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

    const { rows: presupuestoRows } = await query<{
      titulo: string;
      notas: string | null;
      estado: string;
      nombre_respuesta: string | null;
      respondido_en: string | null;
      creado_en: string;
      dientes: number[];
    }>(
      `SELECT titulo, notas, estado, nombre_respuesta, respondido_en, creado_en, dientes
       FROM presupuestos WHERE id = $1 AND paciente_id = $2`,
      [presupuestoId, pacienteId]
    );
    if (presupuestoRows.length === 0) {
      return NextResponse.json({ error: "presupuesto no encontrado" }, { status: 404 });
    }
    const presupuesto = presupuestoRows[0];

    const { rows: items } = await query<PresupuestoItem>(
      `SELECT id, concepto, cantidad::float8 AS cantidad, precio_unitario::float8 AS precio_unitario
       FROM presupuesto_items WHERE presupuesto_id = $1 ORDER BY id`,
      [presupuestoId]
    );

    const datosReporte = await obtenerDatosReporte(pacienteId);
    if (!datosReporte) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }

    const documento = (
      <DocumentoPdf>
        <PresupuestoPdf presupuesto={presupuesto} items={items} pacienteNombre={datosReporte.paciente.nombre} />
        <ReporteClinicoPdf datos={datosReporte} />
      </DocumentoPdf>
    );

    const buffer = await renderToBuffer(documento);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="presupuesto-${datosReporte.paciente.folio ?? pacienteId}-${presupuestoId}.pdf"`,
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
