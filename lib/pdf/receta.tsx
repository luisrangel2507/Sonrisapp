import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import path from "node:path";
import { calcularEdad, fechaSoloDia } from "@/lib/fechas";

// Membrete de la doctora (media carta apaisada, 8.5×5.5in) — se usa
// tal cual como fondo del documento en vez de recrear a mano el
// diseño (curvas, marca de agua de dientes, membrete de contacto):
// así queda pixel-perfecto contra el recetario físico de la clínica.
// Nombre/edad/peso/fecha y el contenido de la receta se sobreponen en
// las zonas en blanco que ya trae la plantilla.
const MEMBRETE_IMAGEN = path.join(process.cwd(), "public", "receta-membrete.jpg");

const ANCHO_PT = 612; // 8.5in × 72pt
const ALTO_PT = 396; // 5.5in × 72pt

const ROSE = "#803449";
const INK = "#2b2118";

const estilos = StyleSheet.create({
  pagina: {
    width: ANCHO_PT,
    height: ALTO_PT,
    fontFamily: "Helvetica",
  },
  fondo: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  campoValor: {
    position: "absolute",
    fontSize: 9,
    color: INK,
  },
  contenido: {
    position: "absolute",
    top: ALTO_PT * 0.435,
    left: ANCHO_PT * 0.06,
    width: ANCHO_PT * 0.66,
  },
  anulada: {
    backgroundColor: "#F7E5E0",
    borderWidth: 1,
    borderColor: "#EABDB0",
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 7,
  },
  anuladaTexto: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#B0503A",
  },
  seccion: {
    marginBottom: 7,
  },
  seccionTitulo: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: ROSE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  parrafo: {
    fontSize: 9,
    lineHeight: 1.45,
    color: INK,
  },
});

function formatearFecha(fecha: string) {
  return fechaSoloDia(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export interface RecetaPdfDatos {
  fecha: string;
  diagnostico: string | null;
  medicamentos: string;
  indicaciones: string | null;
  peso: string | null;
  vigente: boolean;
  motivo_anulacion: string | null;
  anulado_por_nombre: string | null;
}

export interface RecetaPdfPaciente {
  nombre: string;
  fecha_nacimiento: string | null;
}

// Documento de la receta sobre el membrete de la clínica — usado tanto
// por la ruta interna del panel (con sesión) como por el link público
// que la doctora puede compartir por WhatsApp (vía historial_token del
// paciente), para no duplicar el layout en los dos lados.
export function construirRecetaPdfDocumento(receta: RecetaPdfDatos, paciente: RecetaPdfPaciente) {
  const edad = paciente.fecha_nacimiento
    ? `${calcularEdad(paciente.fecha_nacimiento, fechaSoloDia(receta.fecha))} años`
    : "—";

  return (
    <Document>
      <Page size={[ANCHO_PT, ALTO_PT]} style={estilos.pagina}>
        <Image src={MEMBRETE_IMAGEN} style={estilos.fondo} />

        <Text style={{ ...estilos.campoValor, top: ALTO_PT * 0.355, left: ANCHO_PT * 0.128, width: ANCHO_PT * 0.38 }}>
          {paciente.nombre}
        </Text>
        <Text style={{ ...estilos.campoValor, top: ALTO_PT * 0.355, left: ANCHO_PT * 0.585 }}>{edad}</Text>
        <Text style={{ ...estilos.campoValor, top: ALTO_PT * 0.355, left: ANCHO_PT * 0.721 }}>
          {receta.peso || "—"}
        </Text>
        <Text style={{ ...estilos.campoValor, top: ALTO_PT * 0.355, left: ANCHO_PT * 0.854 }}>
          {formatearFecha(receta.fecha)}
        </Text>

        <View style={estilos.contenido}>
          {!receta.vigente && (
            <View style={estilos.anulada}>
              <Text style={estilos.anuladaTexto}>
                RECETA ANULADA{receta.anulado_por_nombre ? ` — por ${receta.anulado_por_nombre}` : ""}
              </Text>
              {receta.motivo_anulacion && (
                <Text style={{ fontSize: 7.5, color: "#B0503A", marginTop: 1 }}>{receta.motivo_anulacion}</Text>
              )}
            </View>
          )}
          {receta.diagnostico && (
            <View style={estilos.seccion}>
              <Text style={estilos.seccionTitulo}>Diagnóstico</Text>
              <Text style={estilos.parrafo}>{receta.diagnostico}</Text>
            </View>
          )}
          <View style={estilos.seccion}>
            <Text style={estilos.seccionTitulo}>Medicamentos</Text>
            <Text style={estilos.parrafo}>{receta.medicamentos}</Text>
          </View>
          {receta.indicaciones && (
            <View style={estilos.seccion}>
              <Text style={estilos.seccionTitulo}>Indicaciones</Text>
              <Text style={estilos.parrafo}>{receta.indicaciones}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
