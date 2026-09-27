import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import path from "node:path";
import { DOCTORA, CLINICA } from "@/lib/panel-data";
import { calcularEdad, fechaSoloDia } from "@/lib/fechas";

const LOGO_IMAGEN = path.join(process.cwd(), "public", "logo-vina-sonrisas.png");

const ROSE = "#803449";
const INK = "#2b2118";
const MUTED = "#8a8272";
const BORDER = "#EFE9DC";

const estilos = StyleSheet.create({
  pagina: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
  },
  encabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: ROSE,
    paddingBottom: 14,
    marginBottom: 20,
  },
  doctoraNombre: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: ROSE,
  },
  doctoraDato: {
    fontSize: 8.5,
    color: MUTED,
    marginTop: 2,
  },
  logoColumna: {
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
    paddingLeft: 16,
    alignItems: "flex-end",
  },
  logo: {
    width: 170,
    objectFit: "contain",
  },
  anulada: {
    backgroundColor: "#F7E5E0",
    borderWidth: 1,
    borderColor: "#EABDB0",
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  anuladaTexto: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#B0503A",
  },
  filaPaciente: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderBottomWidth: 1.5,
    borderBottomColor: INK,
    paddingBottom: 8,
    marginBottom: 24,
  },
  campoPaciente: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginRight: 24,
    marginBottom: 4,
  },
  campoLabel: {
    fontSize: 9.5,
    color: MUTED,
    marginRight: 4,
  },
  campoValor: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
  },
  seccion: {
    marginBottom: 16,
  },
  seccionTitulo: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: ROSE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  parrafo: {
    fontSize: 10.5,
    lineHeight: 1.6,
  },
  piePagina: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
  },
  pieTexto: {
    fontSize: 8.5,
    color: MUTED,
    marginBottom: 2,
  },
});

function formatearFecha(fecha: string) {
  return fechaSoloDia(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
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

// Documento de la receta con membrete — usado tanto por la ruta
// interna del panel (con sesión) como por el link público que la
// doctora puede compartir por WhatsApp (vía historial_token del
// paciente), para no duplicar ~150 líneas de estilos/JSX en los dos lados.
export function construirRecetaPdfDocumento(
  receta: RecetaPdfDatos,
  paciente: RecetaPdfPaciente,
  telefonoClinica: string | null
) {
  const edad = paciente.fecha_nacimiento
    ? `${calcularEdad(paciente.fecha_nacimiento, fechaSoloDia(receta.fecha))} años`
    : "—";

  return (
    <Document>
      <Page size="LETTER" style={estilos.pagina}>
        <View style={estilos.encabezado}>
          <View>
            <Text style={estilos.doctoraNombre}>{DOCTORA.nombre.toUpperCase()}</Text>
            <Text style={estilos.doctoraDato}>{DOCTORA.titulo.toUpperCase()}</Text>
            <Text style={estilos.doctoraDato}>{DOCTORA.universidad}</Text>
            <Text style={estilos.doctoraDato}>Cédula Profesional: {DOCTORA.cedula}</Text>
          </View>
          <View style={estilos.logoColumna}>
            <Image src={LOGO_IMAGEN} style={estilos.logo} />
          </View>
        </View>

        {!receta.vigente && (
          <View style={estilos.anulada}>
            <Text style={estilos.anuladaTexto}>
              RECETA ANULADA{receta.anulado_por_nombre ? ` — por ${receta.anulado_por_nombre}` : ""}
            </Text>
            {receta.motivo_anulacion && (
              <Text style={{ fontSize: 9, color: "#B0503A", marginTop: 2 }}>{receta.motivo_anulacion}</Text>
            )}
          </View>
        )}

        <View style={estilos.filaPaciente}>
          <View style={estilos.campoPaciente}>
            <Text style={estilos.campoLabel}>Nombre:</Text>
            <Text style={estilos.campoValor}>{paciente.nombre}</Text>
          </View>
          <View style={estilos.campoPaciente}>
            <Text style={estilos.campoLabel}>Edad:</Text>
            <Text style={estilos.campoValor}>{edad}</Text>
          </View>
          <View style={estilos.campoPaciente}>
            <Text style={estilos.campoLabel}>Peso:</Text>
            <Text style={estilos.campoValor}>{receta.peso || "—"}</Text>
          </View>
          <View style={{ ...estilos.campoPaciente, marginRight: 0 }}>
            <Text style={estilos.campoLabel}>Fecha:</Text>
            <Text style={estilos.campoValor}>{formatearFecha(receta.fecha)}</Text>
          </View>
        </View>

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

        <View style={estilos.piePagina}>
          {telefonoClinica && <Text style={estilos.pieTexto}>Tel. {telefonoClinica}</Text>}
          <Text style={estilos.pieTexto}>{CLINICA.direccion}</Text>
        </View>
      </Page>
    </Document>
  );
}
