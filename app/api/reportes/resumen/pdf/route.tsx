import { NextResponse } from "next/server";
import { renderToBuffer, Text, View } from "@react-pdf/renderer";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { DocumentoPdf, PaginaPdf, EncabezadoPdf, estilosPdf, PDF_COLOR } from "@/lib/pdf";
import { formatearDinero } from "@/lib/dinero";

export const dynamic = "force-dynamic";

function etiquetaMes(mes: string) {
  const [anio, m] = mes.split("-").map(Number);
  return new Date(anio, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

export async function GET() {
  try {
    const { rows: porMes } = await query<{ mes: string; ingresos: number; pacientes_nuevos: number }>(`
      WITH hoy AS (
        SELECT (now() AT TIME ZONE 'America/Mexico_City')::date AS d
      ),
      meses AS (
        SELECT generate_series(
          date_trunc('month', d) - interval '5 months',
          date_trunc('month', d),
          interval '1 month'
        )::date AS mes_inicio
        FROM hoy
      ),
      limites AS (
        SELECT
          mes_inicio,
          (mes_inicio::timestamp AT TIME ZONE 'America/Mexico_City') AS inicio,
          ((mes_inicio + interval '1 month')::timestamp AT TIME ZONE 'America/Mexico_City') AS fin
        FROM meses
      )
      SELECT
        to_char(l.mes_inicio, 'YYYY-MM') AS mes,
        COALESCE((SELECT SUM(monto) FROM pagos WHERE fecha >= l.inicio AND fecha < l.fin), 0)::float8 AS ingresos,
        (SELECT COUNT(*) FROM pacientes WHERE creado_en >= l.inicio AND creado_en < l.fin)::int AS pacientes_nuevos
      FROM limites l
      ORDER BY l.mes_inicio
    `);

    const { rows: porEstado } = await query<{ estado: string; total: number }>(`
      WITH hoy AS (
        SELECT (now() AT TIME ZONE 'America/Mexico_City')::date AS d
      ),
      inicio6 AS (
        SELECT ((date_trunc('month', d) - interval '5 months')::timestamp AT TIME ZONE 'America/Mexico_City') AS inicio
        FROM hoy
      )
      SELECT estado, COUNT(*)::int AS total
      FROM citas, inicio6
      WHERE fecha_hora >= inicio6.inicio
      GROUP BY estado
    `);

    const { rows: porTratamiento } = await query<{ tratamiento: string; total: number }>(`
      WITH hoy AS (
        SELECT (now() AT TIME ZONE 'America/Mexico_City')::date AS d
      ),
      inicio6 AS (
        SELECT ((date_trunc('month', d) - interval '5 months')::timestamp AT TIME ZONE 'America/Mexico_City') AS inicio
        FROM hoy
      )
      SELECT c.tratamiento, SUM(p.monto)::float8 AS total
      FROM pagos p
      JOIN citas c ON c.id = p.cita_id, inicio6
      WHERE p.fecha >= inicio6.inicio
      GROUP BY c.tratamiento
      ORDER BY total DESC
      LIMIT 8
    `);

    const citasPorEstado = { agendada: 0, completada: 0, cancelada: 0 };
    for (const r of porEstado) {
      if (r.estado in citasPorEstado) citasPorEstado[r.estado as keyof typeof citasPorEstado] = r.total;
    }
    const totalCitas6m = citasPorEstado.agendada + citasPorEstado.completada + citasPorEstado.cancelada;
    const tasaCancelacion = totalCitas6m > 0 ? (citasPorEstado.cancelada / totalCitas6m) * 100 : 0;
    const ingresosTotales = porMes.reduce((s, r) => s + r.ingresos, 0);
    const pacientesNuevos = porMes.reduce((s, r) => s + r.pacientes_nuevos, 0);

    const documento = (
      <DocumentoPdf>
        <PaginaPdf>
          <EncabezadoPdf titulo="Reporte general — últimos 6 meses" />

          <View style={estilosPdf.seccion}>
            <View style={estilosPdf.filaDatos}>
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Ingresos totales</Text>
                <Text style={{ ...estilosPdf.datoValor, fontSize: 13, fontFamily: "Helvetica-Bold", color: PDF_COLOR.rose }}>
                  {formatearDinero(ingresosTotales)}
                </Text>
              </View>
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Pacientes nuevos</Text>
                <Text style={{ ...estilosPdf.datoValor, fontSize: 13, fontFamily: "Helvetica-Bold" }}>{pacientesNuevos}</Text>
              </View>
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Citas completadas</Text>
                <Text style={{ ...estilosPdf.datoValor, fontSize: 13, fontFamily: "Helvetica-Bold" }}>
                  {citasPorEstado.completada}
                </Text>
              </View>
              <View style={estilosPdf.dato}>
                <Text style={estilosPdf.datoLabel}>Tasa de cancelación</Text>
                <Text style={{ ...estilosPdf.datoValor, fontSize: 13, fontFamily: "Helvetica-Bold" }}>
                  {tasaCancelacion.toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>

          <View style={estilosPdf.seccion}>
            <Text style={estilosPdf.seccionTitulo}>Ingresos y pacientes nuevos por mes</Text>
            <View style={estilosPdf.tabla}>
              <View style={estilosPdf.filaTablaHead}>
                <Text style={{ ...estilosPdf.celdaHead, width: "40%" }}>Mes</Text>
                <Text style={{ ...estilosPdf.celdaHead, width: "30%", textAlign: "right" }}>Ingresos</Text>
                <Text style={{ ...estilosPdf.celdaHead, width: "30%", textAlign: "right" }}>Pacientes nuevos</Text>
              </View>
              {porMes.map((r) => (
                <View key={r.mes} style={estilosPdf.filaTabla}>
                  <Text style={{ ...estilosPdf.celda, width: "40%", textTransform: "capitalize" }}>{etiquetaMes(r.mes)}</Text>
                  <Text style={{ ...estilosPdf.celda, width: "30%", textAlign: "right" }}>{formatearDinero(r.ingresos)}</Text>
                  <Text style={{ ...estilosPdf.celda, width: "30%", textAlign: "right" }}>{r.pacientes_nuevos}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={estilosPdf.seccion}>
            <Text style={estilosPdf.seccionTitulo}>Citas por estado</Text>
            <View style={estilosPdf.tabla}>
              <View style={estilosPdf.filaTablaHead}>
                <Text style={{ ...estilosPdf.celdaHead, width: "50%" }}>Estado</Text>
                <Text style={{ ...estilosPdf.celdaHead, width: "50%", textAlign: "right" }}>Citas</Text>
              </View>
              {(["agendada", "completada", "cancelada"] as const).map((estado) => (
                <View key={estado} style={estilosPdf.filaTabla}>
                  <Text style={{ ...estilosPdf.celda, width: "50%", textTransform: "capitalize" }}>{estado}</Text>
                  <Text style={{ ...estilosPdf.celda, width: "50%", textAlign: "right" }}>{citasPorEstado[estado]}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={estilosPdf.seccion}>
            <Text style={estilosPdf.seccionTitulo}>Ingresos por tratamiento</Text>
            {porTratamiento.length === 0 ? (
              <Text style={estilosPdf.vacio}>Sin pagos registrados en este periodo.</Text>
            ) : (
              <View style={estilosPdf.tabla}>
                <View style={estilosPdf.filaTablaHead}>
                  <Text style={{ ...estilosPdf.celdaHead, width: "60%" }}>Tratamiento</Text>
                  <Text style={{ ...estilosPdf.celdaHead, width: "40%", textAlign: "right" }}>Ingresos</Text>
                </View>
                {porTratamiento.map((r) => (
                  <View key={r.tratamiento} style={estilosPdf.filaTabla}>
                    <Text style={{ ...estilosPdf.celda, width: "60%" }}>{r.tratamiento}</Text>
                    <Text style={{ ...estilosPdf.celda, width: "40%", textAlign: "right" }}>{formatearDinero(r.total)}</Text>
                  </View>
                ))}
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
        "Content-Disposition": `inline; filename="reporte-general.pdf"`,
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
