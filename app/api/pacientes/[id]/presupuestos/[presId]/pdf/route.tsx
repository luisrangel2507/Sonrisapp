import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, Text, View, Image, Svg, Polygon } from "@react-pdf/renderer";
import path from "node:path";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { DocumentoPdf, PaginaPdf, EncabezadoPdf, estilosPdf, PDF_COLOR } from "@/lib/pdf";
import { formatearDinero } from "@/lib/dinero";
import { obtenerDatosReporte, ReporteClinicoPdf, formatearFecha } from "@/lib/pdf/reporte-clinico";
import { NUMEROS_FDI, POLIGONOS_DIENTE } from "@/lib/dental";
import type { PresupuestoItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const ODONTOGRAMA_IMAGEN = path.join(process.cwd(), "public", "odontograma-hud.jpg");
const ODONTOGRAMA_ASPECTO = 1300 / 799;

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente de respuesta",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

// Misma foto y mismos polígonos que el odontograma real del paciente
// (ver lib/pdf/reporte-clinico.tsx) — aquí solo marca los dientes
// elegidos para este presupuesto, sin estado clínico, para que el
// paciente reconozca su propia boca en vez de una lista de números.
function DientesRelacionadosPdf({ dientes }: { dientes: number[] }) {
  const set = new Set(dientes);
  return (
    <View style={estilosPdf.seccion}>
      <Text style={estilosPdf.seccionTitulo}>Dientes relacionados</Text>
      <View style={{ width: "70%", alignSelf: "center", position: "relative", aspectRatio: ODONTOGRAMA_ASPECTO }}>
        <Image src={ODONTOGRAMA_IMAGEN} style={{ width: "100%", height: "100%" }} />
        <Svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        >
          {NUMEROS_FDI.filter((n) => set.has(n)).map((n) => (
            // rgba() con alpha en Polygon.fill se pinta azul en esta
            // versión de @react-pdf/renderer — hex sólido + fillOpacity sí funciona.
            <Polygon
              key={n}
              points={POLIGONOS_DIENTE[n]}
              fill={PDF_COLOR.rose}
              fillOpacity={0.55}
              stroke={PDF_COLOR.rose}
              strokeWidth={0.5}
            />
          ))}
        </Svg>
      </View>
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
