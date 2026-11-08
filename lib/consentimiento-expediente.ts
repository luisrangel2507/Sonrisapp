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

// Cláusulas que la NOM-004 (10.1.1) pide en toda carta de consentimiento
// para un procedimiento: riesgos y beneficios, autorización para atender
// contingencias y urgencias, y el derecho a revocar.
const CLAUSULAS_NOM004 = (procedimiento: string) => `Declaro que se me explicó de forma clara y en lenguaje comprensible:

1. Procedimiento: ${procedimiento}, el diagnóstico que lo motiva y en qué consiste.

2. Beneficios esperados: eliminar el dolor o la infección cuando existan, recuperar la función y la estética, y prevenir que el problema avance.

3. Riesgos y molestias posibles: dolor o sensibilidad temporal, inflamación, sangrado leve, reacción a la anestesia local, infección, fractura del diente o de la restauración, necesidad de tratamientos adicionales y, en casos poco frecuentes, lesión de nervios o tejidos vecinos. Se me informó que el resultado depende también de mi salud general, de mi higiene y de que acuda a mis citas.

4. Alternativas: se me explicaron otras opciones de tratamiento, incluida la de no tratarme, y sus consecuencias.

5. Contingencias y urgencias: autorizo a la profesional responsable a atender las contingencias y urgencias que deriven de este procedimiento, aplicando las medidas necesarias para proteger mi salud, aunque no estén previstas en este documento.

6. Tuve oportunidad de hacer preguntas y se me respondieron. Sé que puedo revocar este consentimiento en cualquier momento antes del procedimiento, sin que ello afecte mi atención.

7. Proporcioné información verdadera y completa sobre mi estado de salud, alergias y medicamentos.`;

// Consentimiento general para tratamiento dental (NOM-004 10.1.1).
export function generarConsentimientoTratamiento(
  paciente: { nombre: string; folio: string | null; fecha_nacimiento: string | null },
  procedimiento = "tratamiento odontológico (diagnóstico, limpieza, restauraciones, endodoncia, extracciones u otros procedimientos indicados en mi plan de tratamiento)"
) {
  const hoy = formatearFecha(new Date());
  const titulo = "Carta de consentimiento informado para tratamiento dental";
  const contenido = `Lugar y fecha: ${CLINICA.direccion}, a ${hoy}.

Establecimiento: ${NOMBRE_CLINICA}, a cargo de ${DOCTORA.nombre} (cédula profesional ${DOCTORA.cedula}).

Yo, ${paciente.nombre}, con folio ${paciente.folio ?? "—"}, autorizo de manera libre e informada la realización de: ${procedimiento}.

${CLAUSULAS_NOM004(procedimiento)}

Firmo de conformidad, junto con quien me informó y dos testigos.`;
  return { titulo, contenido };
}

// Consentimiento específico para tratamiento de ortodoncia — el texto
// definitivo lo da la doctora (riesgos, alcance del tratamiento, plan
// de pagos, etc.); mientras tanto se autollena con un borrador
// marcado como pendiente para que no se comparta por accidente sin
// revisar. En cuanto la doctora entregue el texto final, se reemplaza
// aquí (mismo patrón que generarConsentimientoExpediente arriba).
export function generarConsentimientoOrtodoncia(paciente: {
  nombre: string;
  folio: string | null;
  fecha_nacimiento: string | null;
}) {
  const hoy = formatearFecha(new Date());
  const fechaNacimiento = paciente.fecha_nacimiento
    ? formatearFecha(new Date(paciente.fecha_nacimiento))
    : "no registrada";

  const titulo = "Consentimiento informado para tratamiento de ortodoncia";

  const contenido = `Lugar y fecha: ${CLINICA.direccion}, a ${hoy}.

Establecimiento: ${NOMBRE_CLINICA}, a cargo de ${DOCTORA.nombre} (cédula profesional ${DOCTORA.cedula}).

Yo, ${paciente.nombre}, con folio ${paciente.folio ?? "—"} y fecha de nacimiento ${fechaNacimiento}, autorizo de manera libre e informada el inicio de mi tratamiento de ortodoncia.

${CLAUSULAS_NOM004("tratamiento de ortodoncia (colocación, ajustes y retiro de aparatos fijos o removibles, y uso de retenedores al terminar)")}

8. Específico de ortodoncia: entiendo que la duración es estimada y puede alargarse; que pueden presentarse molestias después de cada ajuste, úlceras por los aparatos, descalcificación o manchas blancas y caries si no mantengo una buena higiene, reabsorción de raíces, inflamación de encías y molestias en la articulación de la mandíbula; que debo evitar alimentos duros o pegajosos, asistir a mis citas de ajuste y usar los retenedores indicados, ya que sin ellos los dientes pueden volver a moverse; y que faltar a citas o no seguir las indicaciones puede afectar el resultado. El costo y el plan de pagos se me entregaron por separado en mi presupuesto.

Firmo de conformidad, junto con quien me informó y dos testigos.`;

  return { titulo, contenido };
}
