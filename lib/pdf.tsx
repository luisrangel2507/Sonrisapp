import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { DOCTORA, CLINICA } from "@/lib/panel-data";

// Evita que @react-pdf/renderer intente aplicar hyphenation raro a
// palabras en español (parte "Endo-doncia" a la mitad, etc.).
Font.registerHyphenationCallback((palabra) => [palabra]);

export const PDF_COLOR = {
  ink: "#2b2118",
  muted: "#8a8272",
  mutedLight: "#a49c8a",
  border: "#EFE9DC",
  rose: "#803449",
  roseLight: "#B2485F",
  bg: "#FBF9F4",
  green: "#3F6B33",
};

export const estilosPdf = StyleSheet.create({
  pagina: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 10,
    color: PDF_COLOR.ink,
    fontFamily: "Helvetica",
  },
  encabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: PDF_COLOR.rose,
    paddingBottom: 10,
    marginBottom: 16,
  },
  clinicaNombre: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLOR.rose,
  },
  clinicaSub: {
    fontSize: 8,
    color: PDF_COLOR.muted,
    marginTop: 2,
  },
  docTitulo: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  docFecha: {
    fontSize: 8,
    color: PDF_COLOR.muted,
    textAlign: "right",
    marginTop: 2,
  },
  seccion: {
    marginBottom: 14,
  },
  seccionTitulo: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLOR.rose,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLOR.border,
    paddingBottom: 3,
  },
  filaDatos: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  dato: {
    width: "50%",
    marginBottom: 4,
  },
  datoLabel: {
    fontSize: 7,
    color: PDF_COLOR.mutedLight,
    textTransform: "uppercase",
  },
  datoValor: {
    fontSize: 9.5,
    marginTop: 1,
  },
  tabla: {
    borderTopWidth: 1,
    borderTopColor: PDF_COLOR.border,
  },
  filaTabla: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLOR.border,
    paddingVertical: 5,
  },
  filaTablaHead: {
    flexDirection: "row",
    paddingVertical: 5,
    backgroundColor: "#F5F1EA",
  },
  celda: {
    fontSize: 9,
    paddingHorizontal: 3,
  },
  celdaHead: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLOR.muted,
    textTransform: "uppercase",
    paddingHorizontal: 3,
  },
  piePagina: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: PDF_COLOR.mutedLight,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: PDF_COLOR.border,
    paddingTop: 6,
  },
  parrafo: {
    fontSize: 9.5,
    lineHeight: 1.5,
  },
  vacio: {
    fontSize: 9,
    color: PDF_COLOR.mutedLight,
    fontStyle: "italic",
  },
});

function formatearFechaGeneracion() {
  return new Date().toLocaleString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EncabezadoPdf({ titulo }: { titulo: string }) {
  return (
    <View style={estilosPdf.encabezado} fixed>
      <View>
        <Text style={estilosPdf.clinicaNombre}>Viña Sonrisas</Text>
        <Text style={estilosPdf.clinicaSub}>Odontología Estética</Text>
        <Text style={estilosPdf.clinicaSub}>
          {DOCTORA.nombre} · Céd. Prof. {DOCTORA.cedula}
        </Text>
        <Text style={estilosPdf.clinicaSub}>{CLINICA.direccion}</Text>
      </View>
      <View>
        <Text style={estilosPdf.docTitulo}>{titulo}</Text>
        <Text style={estilosPdf.docFecha}>Generado el {formatearFechaGeneracion()}</Text>
      </View>
    </View>
  );
}

export function PiePaginaPdf() {
  return (
    <Text
      style={estilosPdf.piePagina}
      fixed
      render={({ pageNumber, totalPages }) => `Viña Sonrisas · página ${pageNumber} de ${totalPages}`}
    />
  );
}

export function DocumentoPdf({ children }: { children: React.ReactNode }) {
  return <Document>{children}</Document>;
}

export function PaginaPdf({ children }: { children: React.ReactNode }) {
  return (
    <Page size="LETTER" style={estilosPdf.pagina}>
      {children}
      <PiePaginaPdf />
    </Page>
  );
}
