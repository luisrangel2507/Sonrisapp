import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, Text, View, Image, Svg, Polygon } from "@react-pdf/renderer";
import path from "node:path";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { DocumentoPdf, PaginaPdf, EncabezadoPdf, estilosPdf, PDF_COLOR } from "@/lib/pdf";
import { formatearDinero } from "@/lib/dinero";
import { ARCO_SUPERIOR, ARCO_INFERIOR, ESTADO_DIENTE, POLIGONOS_DIENTE, type EstadoDiente } from "@/lib/dental";
import { HISTORIA_CLINICA_COLUMNAS, HISTORIA_CLINICA_CAMPOS_CIFRABLES } from "@/lib/historia-clinica-campos";
import { descifrar } from "@/lib/crypto";

const ODONTOGRAMA_IMAGEN = path.join(process.cwd(), "public", "odontograma-hud.jpg");
const ODONTOGRAMA_ASPECTO = 1300 / 799;

// Misma foto y mismos polígonos que el odontograma del dashboard —
// solo se colorean los dientes con alguna afectación (los sanos se
// dejan transparentes, igual que en la vista web).
function OdontogramaPdf({ dientes }: { dientes: { numero_fdi: number; estado: EstadoDiente }[] }) {
  const porNumero = new Map(dientes.map((d) => [d.numero_fdi, d.estado]));
  return (
    <View style={{ width: "70%", alignSelf: "center", position: "relative", aspectRatio: ODONTOGRAMA_ASPECTO }}>
      <Image src={ODONTOGRAMA_IMAGEN} style={{ width: "100%", height: "100%" }} />
      <Svg
        viewBox="0 0 100 100"
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
      >
        {[...ARCO_SUPERIOR, ...ARCO_INFERIOR].map((numero) => {
          const estado = porNumero.get(numero);
          if (!estado || estado === "sano") return null;
          const est = ESTADO_DIENTE[estado];
          const fill = estado === "ausente" ? "#0A0A0F" : `rgba(${est.glow},0.45)`;
          return (
            <Polygon
              key={numero}
              points={POLIGONOS_DIENTE[numero]}
              fill={fill}
              stroke={est.ring}
              strokeWidth={0.5}
            />
          );
        })}
      </Svg>
    </View>
  );
}

export const dynamic = "force-dynamic";

function formatearFecha(f: string | null) {
  if (!f) return "—";
  return new Date(f).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

const SI = "Sí";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows: pacienteRows } = await query<{
      id: number;
      nombre: string;
      telefono: string | null;
      email: string | null;
      folio: string | null;
      fecha_nacimiento: string | null;
      creado_en: string;
      alergias: boolean | null;
      alergias_cual: string | null;
      medicamentos: string | null;
      antecedentes_medicos: boolean | null;
      antecedentes_medicos_cual: string | null;
    }>(
      `SELECT id, nombre, telefono, email, folio, fecha_nacimiento, creado_en,
              alergias, alergias_cual, medicamentos, antecedentes_medicos, antecedentes_medicos_cual
       FROM pacientes WHERE id = $1`,
      [pacienteId]
    );
    if (pacienteRows.length === 0) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }
    const paciente = {
      ...pacienteRows[0],
      alergias_cual: descifrar(pacienteRows[0].alergias_cual),
      medicamentos: descifrar(pacienteRows[0].medicamentos),
      antecedentes_medicos_cual: descifrar(pacienteRows[0].antecedentes_medicos_cual),
    };

    const { rows: historiaRows } = await query(
      `SELECT ${HISTORIA_CLINICA_COLUMNAS} FROM historia_clinica WHERE paciente_id = $1 AND vigente = true`,
      [pacienteId]
    );
    const historia = historiaRows[0]
      ? (() => {
          const copia = { ...historiaRows[0] };
          for (const campo of Array.from(HISTORIA_CLINICA_CAMPOS_CIFRABLES)) {
            if (campo in copia) copia[campo] = descifrar(copia[campo]);
          }
          return copia;
        })()
      : null;

    const { rows: dientes } = await query<{ id: number; numero_fdi: number; estado: EstadoDiente }>(
      `SELECT id, numero_fdi, estado FROM paciente_dientes WHERE paciente_id = $1 AND estado <> 'sano' ORDER BY numero_fdi`,
      [pacienteId]
    );
    const { rows: dienteHistorial } = await query<{
      paciente_diente_id: number;
      fecha: string;
      tipo: string;
      nota: string | null;
    }>(
      `SELECT h.paciente_diente_id, h.fecha, h.tipo, h.nota
       FROM diente_historial h
       JOIN paciente_dientes d ON d.id = h.paciente_diente_id
       WHERE d.paciente_id = $1 AND h.vigente = true
       ORDER BY d.numero_fdi, h.fecha ASC`,
      [pacienteId]
    );
    const dienteHistorialDescifrado = dienteHistorial.map((h) => ({ ...h, nota: descifrar(h.nota) }));

    const { rows: notas } = await query<{
      id: number;
      fecha: string;
      tipo: string;
      tratamiento: string | null;
      duracion: string | null;
      nota: string | null;
    }>(
      `SELECT id, fecha, tipo, tratamiento, duracion, nota FROM paciente_notas WHERE paciente_id = $1 AND vigente = true ORDER BY fecha DESC, id DESC`,
      [pacienteId]
    );
    const notasDescifradas = notas.map((n) => ({
      ...n,
      tratamiento: descifrar(n.tratamiento),
      duracion: descifrar(n.duracion),
      nota: descifrar(n.nota),
    }));

    const { rows: citas } = await query<{
      id: number;
      tratamiento: string;
      fecha_hora: string;
      estado: string;
      monto: number | null;
      pagado: number;
    }>(
      `SELECT c.id, c.tratamiento, c.fecha_hora, c.estado, c.monto::float8 AS monto,
              COALESCE((SELECT SUM(monto) FROM pagos WHERE cita_id = c.id), 0)::float8 AS pagado
       FROM citas c WHERE c.paciente_id = $1 ORDER BY c.fecha_hora DESC`,
      [pacienteId]
    );

    const totalPagadoHistorico = citas.reduce((s, c) => s + c.pagado, 0);

    const documento = (
      <DocumentoPdf>
        <PaginaPdf>
          <EncabezadoPdf titulo="Reporte clínico" />

          <View style={estilosPdf.seccion}>
            <Text style={estilosPdf.seccionTitulo}>Datos del paciente</Text>
            <View style={estilosPdf.filaDatos}>
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Nombre</Text>
                <Text style={estilosPdf.datoValor}>{paciente.nombre}</Text>
              </View>
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Folio</Text>
                <Text style={estilosPdf.datoValor}>{paciente.folio ?? "—"}</Text>
              </View>
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Teléfono</Text>
                <Text style={estilosPdf.datoValor}>{paciente.telefono ?? "—"}</Text>
              </View>
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Correo</Text>
                <Text style={estilosPdf.datoValor}>{paciente.email ?? "—"}</Text>
              </View>
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Fecha de nacimiento</Text>
                <Text style={estilosPdf.datoValor}>{formatearFecha(paciente.fecha_nacimiento)}</Text>
              </View>
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Paciente desde</Text>
                <Text style={estilosPdf.datoValor}>{formatearFecha(paciente.creado_en)}</Text>
              </View>
            </View>
          </View>

          <View style={estilosPdf.seccion}>
            <Text style={estilosPdf.seccionTitulo}>Antecedentes clínicos</Text>
            {!historia && !paciente.alergias && !paciente.medicamentos && !paciente.antecedentes_medicos ? (
              <Text style={estilosPdf.vacio}>Sin historia clínica registrada.</Text>
            ) : (
              <View>
                {(paciente.alergias || historia?.alergico_medicamento || historia?.alergico_anestesico) && (
                  <Text style={estilosPdf.parrafo}>
                    • Alergias: {paciente.alergias ? paciente.alergias_cual || SI : "—"}
                    {historia?.alergico_medicamento ? ` · Alérgico a medicamento: ${historia.alergico_medicamento_cual || SI}` : ""}
                    {historia?.alergico_anestesico ? ` · Alérgico a anestésico: ${historia.alergico_anestesico_cual || SI}` : ""}
                  </Text>
                )}
                {(paciente.medicamentos || historia?.toma_medicamento) && (
                  <Text style={estilosPdf.parrafo}>
                    • Medicamentos actuales: {paciente.medicamentos || "—"}
                    {historia?.toma_medicamento ? ` · Toma medicamento: ${historia.toma_medicamento_cual || SI}` : ""}
                  </Text>
                )}
                {(paciente.antecedentes_medicos || historia?.enfermedad_actual) && (
                  <Text style={estilosPdf.parrafo}>
                    • Antecedentes: {paciente.antecedentes_medicos ? paciente.antecedentes_medicos_cual || SI : "—"}
                    {historia?.enfermedad_actual ? ` · Enfermedad actual: ${historia.enfermedad_actual_cual || SI}` : ""}
                  </Text>
                )}
                {historia?.motivo_consulta && (
                  <Text style={estilosPdf.parrafo}>• Motivo de consulta inicial: {historia.motivo_consulta}</Text>
                )}
                {historia?.fam_enfermedad_sistemica && (
                  <Text style={estilosPdf.parrafo}>
                    • Enfermedad sistémica familiar: {historia.fam_enfermedad_cual || SI}
                  </Text>
                )}
                {historia?.cirugia_previa && (
                  <Text style={estilosPdf.parrafo}>• Cirugía previa: {historia.cirugia_previa_cual || SI}</Text>
                )}
                {historia?.problemas_sangrado && <Text style={estilosPdf.parrafo}>• Problemas de sangrado: {SI}</Text>}
                {historia?.embarazada && <Text style={estilosPdf.parrafo}>• Embarazo: {SI}</Text>}
                {historia?.lactancia && <Text style={estilosPdf.parrafo}>• Lactancia: {SI}</Text>}
                {historia?.consume_alcohol && historia.consume_alcohol !== "no" && (
                  <Text style={estilosPdf.parrafo}>
                    • Consume alcohol: {historia.consume_alcohol === "a_veces" ? "A veces" : SI}
                  </Text>
                )}
                {historia?.consume_tabaco && historia.consume_tabaco !== "no" && (
                  <Text style={estilosPdf.parrafo}>
                    • Consume tabaco: {historia.consume_tabaco === "a_veces" ? "A veces" : SI}
                  </Text>
                )}
                {historia?.ets && <Text style={estilosPdf.parrafo}>• Antecedente de ETS: {historia.ets_cual || SI}</Text>}
              </View>
            )}
          </View>

          <View style={estilosPdf.seccion}>
            <Text style={estilosPdf.seccionTitulo}>Odontograma — dientes con hallazgos</Text>
            {dientes.length === 0 ? (
              <Text style={estilosPdf.vacio}>Sin hallazgos registrados — todos los dientes en estado sano.</Text>
            ) : (
              <View>
                <OdontogramaPdf dientes={dientes} />
                <View style={{ marginTop: 10 }} />
                {dientes.map((d) => {
                  const entradas = dienteHistorialDescifrado.filter((h) => h.paciente_diente_id === d.id);
                  const est = ESTADO_DIENTE[d.estado] ?? ESTADO_DIENTE.sano;
                  return (
                    <View key={d.id} style={{ marginBottom: 6 }} wrap={false}>
                      <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold" }}>
                        Diente {d.numero_fdi} — <Text style={{ color: PDF_COLOR.rose }}>{est.label}</Text>
                      </Text>
                      {entradas.length === 0 ? (
                        <Text style={{ ...estilosPdf.vacio, marginLeft: 8 }}>Sin registros de historial.</Text>
                      ) : (
                        entradas.map((e, i) => (
                          <Text key={i} style={{ fontSize: 8.5, color: PDF_COLOR.muted, marginLeft: 8 }}>
                            {formatearFecha(e.fecha)} — {e.tipo}
                            {e.nota ? `: ${e.nota}` : ""}
                          </Text>
                        ))
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={estilosPdf.seccion} break>
            <Text style={estilosPdf.seccionTitulo}>Historial clínico general</Text>
            {notasDescifradas.length === 0 ? (
              <Text style={estilosPdf.vacio}>Sin entradas registradas.</Text>
            ) : (
              <View style={estilosPdf.tabla}>
                <View style={estilosPdf.filaTablaHead}>
                  <Text style={{ ...estilosPdf.celdaHead, width: "16%" }}>Fecha</Text>
                  <Text style={{ ...estilosPdf.celdaHead, width: "18%" }}>Tipo</Text>
                  <Text style={{ ...estilosPdf.celdaHead, width: "22%" }}>Tratamiento</Text>
                  <Text style={{ ...estilosPdf.celdaHead, width: "44%" }}>Nota</Text>
                </View>
                {notasDescifradas.map((n) => (
                  <View key={n.id} style={estilosPdf.filaTabla} wrap={false}>
                    <Text style={{ ...estilosPdf.celda, width: "16%" }}>{formatearFecha(n.fecha)}</Text>
                    <Text style={{ ...estilosPdf.celda, width: "18%" }}>{n.tipo}</Text>
                    <Text style={{ ...estilosPdf.celda, width: "22%" }}>
                      {n.tratamiento ?? "—"}
                      {n.duracion ? ` (${n.duracion})` : ""}
                    </Text>
                    <Text style={{ ...estilosPdf.celda, width: "44%" }}>{n.nota ?? "—"}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={estilosPdf.seccion}>
            <Text style={estilosPdf.seccionTitulo}>Citas y pagos</Text>
            {citas.length === 0 ? (
              <Text style={estilosPdf.vacio}>Sin citas registradas.</Text>
            ) : (
              <View style={estilosPdf.tabla}>
                <View style={estilosPdf.filaTablaHead}>
                  <Text style={{ ...estilosPdf.celdaHead, width: "22%" }}>Fecha</Text>
                  <Text style={{ ...estilosPdf.celdaHead, width: "28%" }}>Tratamiento</Text>
                  <Text style={{ ...estilosPdf.celdaHead, width: "16%" }}>Estado</Text>
                  <Text style={{ ...estilosPdf.celdaHead, width: "17%", textAlign: "right" }}>Monto</Text>
                  <Text style={{ ...estilosPdf.celdaHead, width: "17%", textAlign: "right" }}>Pagado</Text>
                </View>
                {citas.map((c) => (
                  <View key={c.id} style={estilosPdf.filaTabla} wrap={false}>
                    <Text style={{ ...estilosPdf.celda, width: "22%" }}>{formatearFecha(c.fecha_hora)}</Text>
                    <Text style={{ ...estilosPdf.celda, width: "28%" }}>{c.tratamiento}</Text>
                    <Text style={{ ...estilosPdf.celda, width: "16%", textTransform: "capitalize" }}>{c.estado}</Text>
                    <Text style={{ ...estilosPdf.celda, width: "17%", textAlign: "right" }}>
                      {c.monto != null ? formatearDinero(c.monto) : "—"}
                    </Text>
                    <Text style={{ ...estilosPdf.celda, width: "17%", textAlign: "right" }}>
                      {formatearDinero(c.pagado)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
              <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: PDF_COLOR.rose }}>
                Total pagado histórico: {formatearDinero(totalPagadoHistorico)}
              </Text>
            </View>
          </View>
        </PaginaPdf>
      </DocumentoPdf>
    );

    const buffer = await renderToBuffer(documento);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="reporte-${paciente.folio ?? paciente.id}.pdf"`,
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
