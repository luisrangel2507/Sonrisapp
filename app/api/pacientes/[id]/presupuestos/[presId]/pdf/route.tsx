import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, Text, View, Image, Svg, Polygon, Circle, G, StyleSheet } from "@react-pdf/renderer";
import path from "node:path";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { DocumentoPdf, PaginaPdf, EncabezadoPdf, estilosPdf, PDF_COLOR } from "@/lib/pdf";
import { formatearDinero, importeConcepto } from "@/lib/dinero";
import { obtenerDatosReporte, formatearFecha } from "@/lib/pdf/reporte-clinico";
import { NUMEROS_FDI, POLIGONOS_DIENTE, construirMapaEstados } from "@/lib/dental";
import { estadosPersonalizados } from "@/lib/estados-diente";
import { DOCTORA } from "@/lib/panel-data";
import { descifrar } from "@/lib/crypto";
import type { PresupuestoItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const ODONTOGRAMA_IMAGEN = path.join(process.cwd(), "public", "odontograma-hud.jpg");
const ODONTOGRAMA_ASPECTO = 1300 / 799;

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente de respuesta",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

// Centro aproximado de cada polígono, para poner el número del diente.
function centro(numero: number) {
  const pts = POLIGONOS_DIENTE[numero].split(" ").map((par) => par.split(",").map(Number));
  return { x: pts.reduce((t, [px]) => t + px, 0) / pts.length, y: pts.reduce((t, [, py]) => t + py, 0) / pts.length };
}

// Misma foto y polígonos que el odontograma del paciente: marca solo los
// dientes que entran en este presupuesto, con su número encima.
function OdontogramaPresupuestoPdf({ dientes }: { dientes: number[] }) {
  const set = new Set(dientes);
  const marcados = NUMEROS_FDI.filter((n) => set.has(n));
  return (
    <View style={{ width: "72%", alignSelf: "center", position: "relative", aspectRatio: ODONTOGRAMA_ASPECTO }}>
      <Image src={ODONTOGRAMA_IMAGEN} style={{ width: "100%", height: "100%" }} />
      <Svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
      >
        {marcados.map((n) => (
          // hex sólido + fillOpacity (rgba en fill se pinta azul en esta versión).
          <Polygon key={n} points={POLIGONOS_DIENTE[n]} fill={PDF_COLOR.rose} fillOpacity={0.55} stroke={PDF_COLOR.rose} strokeWidth={0.5} />
        ))}
        {marcados.map((n) => {
          const { x, y } = centro(n);
          return (
            <G key={n} style={{ fontSize: 2.8 }}>
              <Circle cx={x} cy={y} r={2.6} fill="#15101f" />
              <Text x={x} y={y + 0.9} fill="#ffffff" textAnchor="middle">
                {n}
              </Text>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const e = StyleSheet.create({
  banda: {
    backgroundColor: PDF_COLOR.rose,
    color: "#ffffff",
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  bandaTexto: { color: "#ffffff", fontSize: 11, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  caja: { borderWidth: 1, borderColor: PDF_COLOR.border, backgroundColor: "#FBF9F4", padding: 8, marginBottom: 12 },
  titulo: { fontSize: 16, fontFamily: "Helvetica-Bold", color: PDF_COLOR.rose },
  intro: { fontSize: 9, color: PDF_COLOR.muted, marginTop: 3 },
  leyenda: { fontSize: 8.5, marginTop: 2 },
  leyendaTipo: { fontFamily: "Helvetica-Bold", color: PDF_COLOR.rose },
  nota: { fontSize: 7, color: PDF_COLOR.mutedLight, fontStyle: "italic", marginTop: 5 },
  dienteTitulo: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  dienteEstado: { color: PDF_COLOR.rose },
  dienteLinea: { fontSize: 8.5, color: PDF_COLOR.muted, marginLeft: 8, marginTop: 1 },
  tablaCab: { flexDirection: "row", backgroundColor: PDF_COLOR.rose, paddingVertical: 5 },
  celdaCab: { color: "#ffffff", fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", paddingHorizontal: 5 },
  fila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: PDF_COLOR.border, paddingVertical: 5 },
  celda: { fontSize: 9, paddingHorizontal: 5 },
  totalCaja: {
    marginTop: 8,
    alignSelf: "flex-end",
    width: "46%",
    borderWidth: 1,
    borderColor: PDF_COLOR.rose,
  },
  totalFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8 },
  firma: { width: "42%", borderTopWidth: 1, borderTopColor: PDF_COLOR.ink, paddingTop: 4, textAlign: "center", fontSize: 8 },
});

interface DientePres {
  numero: number;
  estado: string;
}

// Presupuesto / cotización formal: datos del paciente y de su cita,
// odontograma con los dientes a tratar, qué tiene / qué requiere / cuánto
// cuesta cada diente, conceptos generales, total y plan de pagos.
function PresupuestoPdf({
  presupuesto,
  items,
  pacienteNombre,
  fechaCita,
  dientesInfo,
  presId,
}: {
  presupuesto: {
    titulo: string;
    notas: string | null;
    estado: string;
    nombre_respuesta: string | null;
    respondido_en: string | null;
    creado_en: string;
    dientes: number[];
    pago_inicial: number | null;
    mensualidades: number | null;
    monto_ajuste: number | null;
  };
  items: PresupuestoItem[];
  pacienteNombre: string;
  fechaCita: string | null;
  dientesInfo: DientePres[];
  presId: number;
}) {
  const total = items.reduce((suma, it) => suma + importeConcepto(it), 0);
  const subtotal = items.reduce((suma, it) => suma + it.cantidad * it.precio_unitario, 0);
  const descuentoTotal = subtotal - total;
  const nDientes = presupuesto.dientes.length;
  const porDiente = items.filter((it) => it.por_diente && nDientes > 0);
  const listaPiezas =
    nDientes >= NUMEROS_FDI.length ? `Todos (${nDientes})` : presupuesto.dientes.slice().sort((x, y) => x - y).join(", ");
  // Hallazgos: dientes del presupuesto agrupados por su estado registrado.
  const hallazgosMapa = new Map<string, number[]>();
  for (const n of presupuesto.dientes.slice().sort((x, y) => x - y)) {
    const est = dientesInfo.find((d) => d.numero === n)?.estado;
    if (est) hallazgosMapa.set(est, [...(hallazgosMapa.get(est) ?? []), n]);
  }
  const hallazgos = [...hallazgosMapa.entries()];
  const porAjuste = (presupuesto.monto_ajuste ?? 0) > 0;
  const hayPlan = porAjuste || (presupuesto.mensualidades ?? 0) > 0 || (presupuesto.pago_inicial ?? 0) > 0;
  const inicial = presupuesto.pago_inicial ?? 0;
  const mensualidad = !porAjuste && (presupuesto.mensualidades ?? 0) > 0 ? Math.max(0, total - inicial) / (presupuesto.mensualidades as number) : 0;

  return (
    <PaginaPdf>
      <EncabezadoPdf titulo="Presupuesto / Cotización" />

      <View style={e.banda}>
        <Text style={e.bandaTexto}>PLAN DE TRATAMIENTO</Text>
        <Text style={e.bandaTexto}>No. {String(presId).padStart(4, "0")}</Text>
      </View>

      <View style={e.caja}>
        <View style={estilosPdf.filaDatos}>
          <View style={estilosPdf.dato}>
            <Text style={estilosPdf.datoLabel}>Paciente</Text>
            <Text style={{ ...estilosPdf.datoValor, fontFamily: "Helvetica-Bold" }}>{pacienteNombre}</Text>
          </View>
          <View style={estilosPdf.dato}>
            <Text style={estilosPdf.datoLabel}>Fecha de la cita</Text>
            <Text style={estilosPdf.datoValor}>{formatearFecha(fechaCita ?? presupuesto.creado_en)}</Text>
          </View>
          <View style={estilosPdf.dato}>
            <Text style={estilosPdf.datoLabel}>Fecha del presupuesto</Text>
            <Text style={estilosPdf.datoValor}>{formatearFecha(presupuesto.creado_en)}</Text>
          </View>
          <View style={estilosPdf.dato}>
            <Text style={estilosPdf.datoLabel}>Tratamiento</Text>
            <Text style={estilosPdf.datoValor}>{presupuesto.titulo}</Text>
          </View>
        </View>
      </View>

      <View style={{ marginBottom: 8 }}>
        <Text style={e.titulo}>Tratamiento propuesto</Text>
        <Text style={e.intro}>Procedimientos incluidos en esta propuesta y su organización por etapas.</Text>
      </View>

      {nDientes > 0 && (
        <View style={estilosPdf.seccion}>
          <OdontogramaPresupuestoPdf dientes={presupuesto.dientes} />
          <View style={{ marginTop: 8 }}>
            {hallazgos.map(([estado, dientes]) => (
              <Text key={estado} style={e.leyenda}>
                <Text style={e.leyendaTipo}>Hallazgo · </Text>
                {estado}: {dientes.join(", ")}
              </Text>
            ))}
            {porDiente.map((it) => (
              <Text key={it.id} style={e.leyenda}>
                <Text style={e.leyendaTipo}>Propuesta · </Text>
                {it.concepto}: {listaPiezas}
              </Text>
            ))}
            <Text style={e.nota}>
              Esquema ilustrativo de los registros del plan. Los dientes marcados son los que reciben tratamiento.
              La propuesta no sustituye la valoración clínica y puede cambiar según la evolución del paciente.
            </Text>
          </View>
        </View>
      )}

      <View style={estilosPdf.seccion}>
        <View style={e.tablaCab}>
          <Text style={{ ...e.celdaCab, width: "34%" }}>Procedimiento</Text>
          <Text style={{ ...e.celdaCab, width: "20%" }}>Piezas</Text>
          <Text style={{ ...e.celdaCab, width: "8%", textAlign: "right" }}>Cant.</Text>
          <Text style={{ ...e.celdaCab, width: "14%", textAlign: "right" }}>Precio unit.</Text>
          <Text style={{ ...e.celdaCab, width: "9%", textAlign: "right" }}>Desc.</Text>
          <Text style={{ ...e.celdaCab, width: "15%", textAlign: "right" }}>Importe</Text>
        </View>
        {items.map((it) => (
          <View key={it.id} style={e.fila} wrap={false}>
            <View style={{ width: "34%", paddingHorizontal: 5 }}>
              <Text style={{ fontSize: 9 }}>{it.concepto}</Text>
              {it.etapa ? <Text style={{ fontSize: 7.5, color: PDF_COLOR.muted, marginTop: 1 }}>Etapa: {it.etapa}</Text> : null}
            </View>
            <Text style={{ ...e.celda, width: "20%", fontSize: 8 }}>
              {it.por_diente && nDientes > 0 ? listaPiezas : "—"}
            </Text>
            <Text style={{ ...e.celda, width: "8%", textAlign: "right" }}>{it.cantidad}</Text>
            <Text style={{ ...e.celda, width: "14%", textAlign: "right" }}>{formatearDinero(it.precio_unitario)}</Text>
            <Text style={{ ...e.celda, width: "9%", textAlign: "right" }}>{it.descuento ?? 0}%</Text>
            <Text style={{ ...e.celda, width: "15%", textAlign: "right" }}>{formatearDinero(importeConcepto(it))}</Text>
          </View>
        ))}
        {presupuesto.notas && <Text style={{ ...estilosPdf.parrafo, marginTop: 8 }}>{presupuesto.notas}</Text>}

        <View style={e.totalCaja} wrap={false}>
          {descuentoTotal > 0 && (
            <>
              <View style={e.totalFila}>
                <Text style={{ fontSize: 9, color: PDF_COLOR.muted }}>Subtotal</Text>
                <Text style={{ fontSize: 9, color: PDF_COLOR.muted }}>{formatearDinero(subtotal)}</Text>
              </View>
              <View style={e.totalFila}>
                <Text style={{ fontSize: 9, color: PDF_COLOR.muted }}>Descuento</Text>
                <Text style={{ fontSize: 9, color: PDF_COLOR.muted }}>-{formatearDinero(descuentoTotal)}</Text>
              </View>
            </>
          )}
          <View style={e.totalFila}>
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: PDF_COLOR.rose }}>TOTAL</Text>
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: PDF_COLOR.rose }}>{formatearDinero(total)}</Text>
          </View>
        </View>
      </View>

      {hayPlan && (
        <View style={estilosPdf.seccion} wrap={false}>
          <Text style={estilosPdf.seccionTitulo}>Plan de pagos — ortodoncia (brackets)</Text>
          <View style={e.tablaCab}>
            <Text style={{ ...e.celdaCab, width: "40%" }}>Concepto</Text>
            <Text style={{ ...e.celdaCab, width: "30%", textAlign: "right" }}>Pagos</Text>
            <Text style={{ ...e.celdaCab, width: "30%", textAlign: "right" }}>Importe</Text>
          </View>
          <View style={e.fila}>
            <Text style={{ ...e.celda, width: "40%" }}>Pago inicial</Text>
            <Text style={{ ...e.celda, width: "30%", textAlign: "right" }}>1</Text>
            <Text style={{ ...e.celda, width: "30%", textAlign: "right" }}>{formatearDinero(inicial)}</Text>
          </View>
          {porAjuste ? (
            <View style={e.fila}>
              <Text style={{ ...e.celda, width: "40%" }}>Ajuste / mantenimiento</Text>
              <Text style={{ ...e.celda, width: "30%", textAlign: "right" }}>
                {presupuesto.mensualidades ? `${presupuesto.mensualidades} visitas` : "Cada visita"}
              </Text>
              <Text style={{ ...e.celda, width: "30%", textAlign: "right" }}>
                {formatearDinero(presupuesto.monto_ajuste as number)} c/u
              </Text>
            </View>
          ) : (
            (presupuesto.mensualidades ?? 0) > 0 && (
              <View style={e.fila}>
                <Text style={{ ...e.celda, width: "40%" }}>Mensualidades</Text>
                <Text style={{ ...e.celda, width: "30%", textAlign: "right" }}>{presupuesto.mensualidades}</Text>
                <Text style={{ ...e.celda, width: "30%", textAlign: "right" }}>{formatearDinero(mensualidad)} c/u</Text>
              </View>
            )
          )}
        </View>
      )}

      <View style={estilosPdf.seccion} wrap={false}>
        <Text style={estilosPdf.seccionTitulo}>Estado</Text>
        <Text style={estilosPdf.parrafo}>{ETIQUETA_ESTADO[presupuesto.estado] ?? presupuesto.estado}</Text>
        {presupuesto.estado !== "pendiente" && presupuesto.respondido_en && (
          <Text style={{ ...estilosPdf.parrafo, color: PDF_COLOR.muted, marginTop: 2 }}>
            Por {presupuesto.nombre_respuesta} el {formatearFecha(presupuesto.respondido_en)}
          </Text>
        )}
        <Text style={{ ...estilosPdf.parrafo, color: PDF_COLOR.muted, marginTop: 6, fontSize: 8 }}>
          Este presupuesto es informativo y está sujeto a cambios según la evolución clínica del tratamiento. Vigencia: 30 días.
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 26 }}>
          <Text style={e.firma}>{DOCTORA.nombre}</Text>
          <Text style={e.firma}>Acepto el presupuesto: {pacienteNombre}</Text>
        </View>
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
      pago_inicial: number | null;
      mensualidades: number | null;
      monto_ajuste: number | null;
    }>(
      `SELECT titulo, notas, estado, nombre_respuesta, respondido_en, creado_en, dientes,
              pago_inicial::float8 AS pago_inicial, mensualidades, monto_ajuste::float8 AS monto_ajuste
       FROM presupuestos WHERE id = $1 AND paciente_id = $2`,
      [presupuestoId, pacienteId]
    );
    if (presupuestoRows.length === 0) {
      return NextResponse.json({ error: "presupuesto no encontrado" }, { status: 404 });
    }
    const presupuesto = { ...presupuestoRows[0], notas: descifrar(presupuestoRows[0].notas) };

    const { rows: itemsRows } = await query<PresupuestoItem>(
      `SELECT id, concepto, cantidad::float8 AS cantidad, precio_unitario::float8 AS precio_unitario, por_diente,
              etapa, descuento::float8 AS descuento
       FROM presupuesto_items WHERE presupuesto_id = $1 ORDER BY id`,
      [presupuestoId]
    );
    const items = itemsRows.map((it) => ({ ...it, concepto: descifrar(it.concepto) ?? it.concepto }));

    const datosReporte = await obtenerDatosReporte(pacienteId);
    if (!datosReporte) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }

    // Cita más cercana a la fecha del presupuesto (a la que acudió).
    const { rows: citaRows } = await query<{ fecha_hora: string }>(
      `SELECT c.fecha_hora FROM citas c, presupuestos p
       WHERE p.id = $2 AND c.paciente_id = $1 AND c.estado <> 'cancelada'
       ORDER BY abs(extract(epoch FROM (c.fecha_hora - p.creado_en))) LIMIT 1`,
      [pacienteId, presupuestoId]
    );

    const mapaEstados = construirMapaEstados(await estadosPersonalizados());
    const { rows: dRows } = await query<{ numero_fdi: number; estado: string }>(
      `SELECT numero_fdi, estado FROM paciente_dientes WHERE paciente_id = $1 AND numero_fdi = ANY($2)`,
      [pacienteId, presupuesto.dientes]
    );
    const dientesInfo = dRows
      .filter((d) => d.estado !== "sano")
      .map((d) => ({ numero: d.numero_fdi, estado: mapaEstados[d.estado]?.label ?? d.estado }));

    const documento = (
      <DocumentoPdf>
        <PresupuestoPdf
          presupuesto={presupuesto}
          items={items}
          pacienteNombre={datosReporte.paciente.nombre}
          fechaCita={citaRows[0]?.fecha_hora ?? null}
          dientesInfo={dientesInfo}
          presId={presupuestoId}
        />
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
