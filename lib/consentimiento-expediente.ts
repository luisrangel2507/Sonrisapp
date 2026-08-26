import { CLINICA, DOCTORA } from "@/lib/panel-data";

const NOMBRE_CLINICA = "Viña Sonrisas";

function formatearFecha(fecha: Date) {
  return fecha.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

// Carta de consentimiento informado para el manejo del expediente
// clínico electrónico, con base en lo que exige la NOM-024-SSA3-2012
// (confidencialidad, cifrado/seguridad de la información, trazabilidad
// e intercambio de información en salud). Se autollena con los datos
// ya capturados del paciente — no requiere que la doctora escriba nada.
export function generarConsentimientoExpediente(paciente: {
  nombre: string;
  folio: string | null;
  fecha_nacimiento: string | null;
}) {
  const hoy = formatearFecha(new Date());
  const fechaNacimiento = paciente.fecha_nacimiento
    ? formatearFecha(new Date(paciente.fecha_nacimiento))
    : "no registrada";

  const titulo = "Consentimiento para el manejo de mi expediente clínico electrónico";

  const contenido = `Yo, ${paciente.nombre}, identificado(a) con folio ${paciente.folio ?? "—"} y fecha de nacimiento ${fechaNacimiento}, en pleno uso de mis facultades, otorgo mi consentimiento informado a ${NOMBRE_CLINICA}, a cargo de ${DOCTORA.nombre} (cédula profesional ${DOCTORA.cedula}), ubicada en ${CLINICA.direccion}, para que mi información de salud sea generada, almacenada y consultada mediante un Sistema de Información de Registro Electrónico para la Salud (expediente clínico electrónico), de conformidad con la Norma Oficial Mexicana NOM-024-SSA3-2012.

Entiendo y acepto que:

1. Mi información —incluyendo historia clínica, odontograma, notas de tratamiento, estudios y documentos adjuntos— se guarda de forma electrónica y cifrada, con acceso restringido únicamente al personal autorizado del consultorio.

2. Esta información se maneja con discreción y confidencialidad, y no será revelada a terceros sin mi autorización expresa, salvo en los casos previstos por las disposiciones jurídicas aplicables en materia de salud.

3. El expediente conserva un registro de auditoría (trazabilidad): cualquier corrección a mi información queda documentada, identificando quién la hizo y cuándo, sin que los datos originales se pierdan.

4. Puedo solicitar en cualquier momento acceso, copia o corrección de mi información, conforme a las disposiciones aplicables en materia de protección de datos personales.

5. Este consentimiento aplica mientras sea paciente de ${NOMBRE_CLINICA} y puede ser revocado por escrito en cualquier momento, sin que ello afecte la atención médica ya prestada.

Firmo de conformidad el día de hoy, ${hoy}.`;

  return { titulo, contenido };
}
