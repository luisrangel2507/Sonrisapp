// Preguntas de la historia clínica que llena el paciente (wizard de la
// app y versión ligera /ligera). Vive aparte del componente (que es
// "use client") para que también se pueda usar desde el servidor.
import type { FormStateHistoriaClinica } from "@/components/HistoriaClinicaFormulario";

// Parentescos del cuadro de antecedentes heredofamiliares, en el orden
// del formulario en papel.
export const PARENTESCOS_FAMILIA = [
  "Madre",
  "Padre",
  "Hermanos",
  "Hijos",
  "Primos",
  "Tíos",
  "Abuelo materno",
  "Abuela materna",
  "Abuelo paterno",
  "Abuela paterna",
  // Registro anterior (antes eran "Abuelos" en conjunto): ya no se muestra,
  // pero se conserva en lo guardado.
  "Abuelos",
] as const;

export interface FamiliarDetalle {
  parentesco: string;
  vive: boolean | null;
  enfermedades: string | null;
  // "No aplica" (ej. hijo único): no se pregunta si vive ni enfermedades.
  no_aplica?: boolean;
  // Solo para Primos y Tíos: "Sí aplica" (hay algún caso que declarar).
  si_aplica?: boolean;
}


export type Seccion =
  | "Ficha de identificación"
  | "Antecedentes heredofamiliares"
  | "Antecedentes personales"
  | "Antecedentes personales no patológicos"
  | "Antecedentes odontológicos"
  | "Antecedentes médicos";

// Teléfono/email/alergias/antecedentes médicos generales viven en la
// tabla pacientes (no en historia_clinica), así que no forman parte de
// FormStateHistoriaClinica — el wizard los maneja aparte, igual que ya
// hace con fecha_nacimiento. El alta rápida del paciente ya no los
// pide (solo nombre) — se completan aquí, en su propia historia
// clínica.
export interface DatosPacienteWizard {
  telefono: string | null;
  email: string | null;
  alergias: boolean | null;
  alergias_cual: string | null;
  antecedentes_medicos: boolean | null;
  antecedentes_medicos_cual: string | null;
}

// mostrarSi recibe también la edad calculada de la fecha de nacimiento
// y los datos del paciente de arriba (ninguno vive en
// FormStateHistoriaClinica) — la usa el paso de "nombre del padre o
// tutor" para solo aparecer si es menor de edad, y los pasos "¿cuál?"
// de alergias/antecedentes para solo aparecer si contestó que sí.
export type Paso =
  | {
      key: keyof FormStateHistoriaClinica;
      tipo: "texto";
      pregunta: string;
      seccion: Seccion;
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    }
  | {
      key: keyof FormStateHistoriaClinica;
      tipo: "bool";
      pregunta: string;
      seccion: Seccion;
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    }
  | {
      key: "sexo";
      tipo: "sexo";
      pregunta: string;
      seccion: Seccion;
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    }
  | {
      key: "fecha_nacimiento";
      tipo: "fecha_nacimiento";
      pregunta: string;
      seccion: Seccion;
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    }
  | {
      key: "emergencia";
      tipo: "emergencia";
      pregunta: string;
      seccion: Seccion;
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    }
  | {
      key: "domicilio";
      tipo: "domicilio";
      pregunta: string;
      seccion: Seccion;
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    }
  | {
      key: keyof FormStateHistoriaClinica;
      tipo: "frecuencia";
      pregunta: string;
      seccion: Seccion;
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    }
  | {
      key: keyof DatosPacienteWizard;
      tipo: "paciente_bool";
      pregunta: string;
      seccion: Seccion;
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    }
  | {
      key: keyof DatosPacienteWizard;
      tipo: "paciente_texto";
      pregunta: string;
      seccion: Seccion;
      inputType?: "tel" | "email";
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    }
  | {
      key: "fam_detalle";
      tipo: "familiares";
      pregunta: string;
      seccion: Seccion;
      parentescos?: string[];
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    }
  | {
      key: keyof FormStateHistoriaClinica;
      tipo: "opciones";
      pregunta: string;
      seccion: Seccion;
      opciones: { valor: string; label: string }[];
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    }
  | {
      key: keyof FormStateHistoriaClinica;
      tipo: "multi";
      pregunta: string;
      seccion: Seccion;
      opciones: { valor: string; label: string }[];
      exclusiva?: string;
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    };

export const PASOS: Paso[] = [
  { key: "sexo", tipo: "sexo", pregunta: "¿Cuál es tu sexo?", seccion: "Ficha de identificación" },
  {
    key: "fecha_nacimiento",
    tipo: "fecha_nacimiento",
    pregunta: "¿Cuál es tu fecha de nacimiento?",
    seccion: "Ficha de identificación",
  },
  {
    key: "telefono",
    tipo: "paciente_texto",
    pregunta: "¿Cuál es tu teléfono?",
    seccion: "Ficha de identificación",
    inputType: "tel",
  },
  {
    key: "email",
    tipo: "paciente_texto",
    pregunta: "¿Cuál es tu correo?",
    seccion: "Ficha de identificación",
    inputType: "email",
  },
  {
    key: "nombre_padre_tutor",
    tipo: "texto",
    pregunta: "Nombre del padre o tutor",
    seccion: "Ficha de identificación",
    // Solo aplica si es menor de edad — si no se sabe la edad (no
    // contestó la fecha de nacimiento), se asume que no aplica.
    mostrarSi: (_f, edad) => edad !== null && edad < 18,
  },
  { key: "ocupacion", tipo: "texto", pregunta: "¿Cuál es tu ocupación?", seccion: "Ficha de identificación" },
  {
    key: "motivo_consulta",
    tipo: "texto",
    pregunta: "¿Cuál es el motivo de tu consulta?",
    seccion: "Ficha de identificación",
  },
  { key: "domicilio", tipo: "domicilio", pregunta: "¿Cuál es tu domicilio?", seccion: "Ficha de identificación" },
  {
    key: "emergencia",
    tipo: "emergencia",
    pregunta: "En caso de emergencia, ¿a quién llamamos?",
    seccion: "Ficha de identificación",
  },
  {
    key: "fam_detalle",
    tipo: "familiares",
    pregunta: "¿Viven tus familiares directos? ¿Alguno tiene o tuvo alguna enfermedad?",
    seccion: "Antecedentes heredofamiliares",
    parentescos: ["Madre", "Padre", "Hermanos"],
  },
  {
    key: "fam_detalle",
    tipo: "familiares",
    pregunta: "Más familiares: ¿viven? ¿alguna enfermedad?",
    seccion: "Antecedentes heredofamiliares",
    parentescos: ["Hijos", "Primos", "Tíos"],
  },
  {
    key: "fam_detalle",
    tipo: "familiares",
    pregunta: "Abuelos maternos (papás de tu mamá): ¿viven? ¿alguna enfermedad?",
    seccion: "Antecedentes heredofamiliares",
    parentescos: ["Abuelo materno", "Abuela materna"],
  },
  {
    key: "fam_detalle",
    tipo: "familiares",
    pregunta: "Abuelos paternos (papás de tu papá): ¿viven? ¿alguna enfermedad?",
    seccion: "Antecedentes heredofamiliares",
    parentescos: ["Abuelo paterno", "Abuela paterna"],
  },
  {
    key: "fam_enfermedad_sistemica",
    tipo: "bool",
    pregunta: "¿Algún otro familiar tiene alguna enfermedad sistémica?",
    seccion: "Antecedentes heredofamiliares",
  },
  {
    key: "fam_enfermedad_cual",
    tipo: "texto",
    pregunta: "¿Cuál o cuáles?",
    seccion: "Antecedentes heredofamiliares",
    mostrarSi: (f) => f.fam_enfermedad_sistemica === true,
  },
  {
    key: "enfermedad_actual",
    tipo: "bool",
    pregunta: "¿Tienes alguna enfermedad actual?",
    seccion: "Antecedentes personales",
  },
  {
    key: "enfermedad_actual_cual",
    tipo: "texto",
    pregunta: "¿Cuál?",
    seccion: "Antecedentes personales",
    mostrarSi: (f) => f.enfermedad_actual === true,
  },
  {
    key: "toma_medicamento",
    tipo: "bool",
    pregunta: "¿Tomas algún medicamento?",
    seccion: "Antecedentes personales",
  },
  {
    key: "toma_medicamento_cual",
    tipo: "texto",
    pregunta: "¿Cuál?",
    seccion: "Antecedentes personales",
    mostrarSi: (f) => f.toma_medicamento === true,
  },
  {
    key: "alergico_medicamento",
    tipo: "bool",
    pregunta: "¿Eres alérgico a algún medicamento?",
    seccion: "Antecedentes personales",
  },
  {
    key: "alergico_medicamento_cual",
    tipo: "texto",
    pregunta: "¿A cuál?",
    seccion: "Antecedentes personales",
    mostrarSi: (f) => f.alergico_medicamento === true,
  },
  {
    key: "alergico_anestesico",
    tipo: "bool",
    pregunta: "¿Eres alérgico a algún anestésico?",
    seccion: "Antecedentes personales",
  },
  {
    key: "alergico_anestesico_cual",
    tipo: "texto",
    pregunta: "¿A cuál?",
    seccion: "Antecedentes personales",
    mostrarSi: (f) => f.alergico_anestesico === true,
  },
  {
    key: "cirugia_previa",
    tipo: "bool",
    pregunta: "¿Has sido intervenido quirúrgicamente?",
    seccion: "Antecedentes personales",
  },
  {
    key: "cirugia_previa_cual",
    tipo: "texto",
    pregunta: "¿De qué?",
    seccion: "Antecedentes personales",
    mostrarSi: (f) => f.cirugia_previa === true,
  },
  {
    key: "problemas_sangrado",
    tipo: "bool",
    pregunta: "¿Presentas problemas de sangrado o cicatrización?",
    seccion: "Antecedentes personales",
  },
  {
    key: "embarazada",
    tipo: "bool",
    pregunta: "¿Estás embarazada?",
    seccion: "Antecedentes personales",
    mostrarSi: (f) => f.sexo === "F",
  },
  {
    key: "lactancia",
    tipo: "bool",
    pregunta: "¿Estás en periodo de lactancia?",
    seccion: "Antecedentes personales",
    mostrarSi: (f) => f.sexo === "F",
  },
  {
    key: "esquema_vacunacion",
    tipo: "opciones",
    pregunta: "¿Tu esquema de vacunación está completo?",
    seccion: "Antecedentes personales",
    opciones: [
      { valor: "completo", label: "Completo" },
      { valor: "incompleto", label: "Incompleto" },
    ],
  },
  {
    key: "otros_antecedentes",
    tipo: "texto",
    pregunta: "¿Algún otro antecedente relevante que quieras contarnos?",
    seccion: "Antecedentes personales",
  },
  {
    key: "consume_alcohol",
    tipo: "frecuencia",
    pregunta: "¿Consumes alcohol?",
    seccion: "Antecedentes personales no patológicos",
  },
  {
    key: "consume_tabaco",
    tipo: "frecuencia",
    pregunta: "¿Consumes tabaco?",
    seccion: "Antecedentes personales no patológicos",
  },
  {
    key: "ets",
    tipo: "bool",
    pregunta: "¿Alguna enfermedad de transmisión sexual (VIH/VPH)?",
    seccion: "Antecedentes personales no patológicos",
  },
  {
    key: "ets_cual",
    tipo: "texto",
    pregunta: "¿Cuál?",
    seccion: "Antecedentes personales no patológicos",
    mostrarSi: (f) => f.ets === true,
  },
  {
    key: "tipo_alimentacion",
    tipo: "opciones",
    pregunta: "¿Cómo es tu tipo de alimentación?",
    seccion: "Antecedentes personales no patológicos",
    opciones: [
      { valor: "vegetariana", label: "Vegetariana" },
      { valor: "vegana", label: "Vegana" },
      { valor: "mixta", label: "Mixta" },
      { valor: "sin_restricciones", label: "Sin restricciones" },
    ],
  },
  {
    key: "cepilla_dientes",
    tipo: "bool",
    pregunta: "¿Te cepillas los dientes?",
    seccion: "Antecedentes personales no patológicos",
  },
  {
    key: "cepilla_momento",
    tipo: "multi",
    pregunta: "¿Cuándo te cepillas?",
    seccion: "Antecedentes personales no patológicos",
    opciones: [
      { valor: "manana", label: "Mañana" },
      { valor: "tarde", label: "Tarde" },
      { valor: "noche", label: "Noche" },
    ],
    mostrarSi: (f) => f.cepilla_dientes === true,
  },
  {
    key: "higiene_utiliza",
    tipo: "multi",
    pregunta: "¿Qué utilizas para tu higiene bucal?",
    seccion: "Antecedentes personales no patológicos",
    opciones: [
      { valor: "pasta_dental", label: "Pasta dental" },
      { valor: "hilo_dental", label: "Hilo dental" },
      { valor: "enjuague", label: "Enjuague" },
      { valor: "cepillo", label: "Cepillo" },
    ],
  },
  {
    key: "cepillo_consistencia",
    tipo: "opciones",
    pregunta: "¿De qué consistencia es tu cepillo?",
    seccion: "Antecedentes personales no patológicos",
    opciones: [
      { valor: "suave", label: "Suave" },
      { valor: "mediano", label: "Mediano" },
      { valor: "duro", label: "Duro" },
    ],
  },
  {
    key: "bruxismo",
    tipo: "bool",
    pregunta: "¿Aprietas o rechinas los dientes (bruxismo)?",
    seccion: "Antecedentes personales no patológicos",
  },
  {
    key: "ejercicio",
    tipo: "texto",
    pregunta: "¿Realizas algún tipo de ejercicio?",
    seccion: "Antecedentes personales no patológicos",
  },
  {
    key: "ultima_consulta_dentista",
    tipo: "texto",
    pregunta: "¿Cuándo fue tu última consulta con el dentista?",
    seccion: "Antecedentes odontológicos",
  },
  {
    key: "motivo_ultima_consulta",
    tipo: "texto",
    pregunta: "¿Cuál fue el motivo?",
    seccion: "Antecedentes odontológicos",
    mostrarSi: (f) => !!f.ultima_consulta_dentista,
  },
  {
    key: "ansiedad_dental",
    tipo: "bool",
    pregunta: "¿Sientes ansiedad o has tenido una mala experiencia dental?",
    seccion: "Antecedentes odontológicos",
  },
  {
    key: "ansiedad_dental_descripcion",
    tipo: "texto",
    pregunta: "Cuéntanos un poco más",
    seccion: "Antecedentes odontológicos",
    mostrarSi: (f) => f.ansiedad_dental === true,
  },
  {
    key: "tratamientos_previos",
    tipo: "multi",
    pregunta: "¿Qué tratamientos dentales te has hecho antes?",
    seccion: "Antecedentes odontológicos",
    opciones: [
      { valor: "ortodoncia", label: "Ortodoncia" },
      { valor: "endodoncia", label: "Endodoncia" },
      { valor: "cirugia", label: "Cirugía" },
      { valor: "protesis", label: "Prótesis" },
      { valor: "implantes", label: "Implantes" },
      { valor: "periodoncia", label: "Periodoncia" },
      { valor: "no_recuerda", label: "No recuerdo" },
    ],
    exclusiva: "no_recuerda",
  },
  {
    key: "traumatismos_dentales",
    tipo: "bool",
    pregunta: "¿Has tenido algún traumatismo dental (golpe, fractura)?",
    seccion: "Antecedentes odontológicos",
  },
  {
    key: "traumatismos_dentales_cual",
    tipo: "texto",
    pregunta: "¿Cuál y cuándo?",
    seccion: "Antecedentes odontológicos",
    mostrarSi: (f) => f.traumatismos_dentales === true,
  },
  {
    key: "alergias",
    tipo: "paciente_bool",
    pregunta: "¿Tienes alguna alergia?",
    seccion: "Antecedentes médicos",
  },
  {
    key: "alergias_cual",
    tipo: "paciente_texto",
    pregunta: "¿Cuál?",
    seccion: "Antecedentes médicos",
    mostrarSi: (_f, _edad, dp) => dp.alergias === true,
  },
  {
    key: "antecedentes_medicos",
    tipo: "paciente_bool",
    pregunta: "¿Otro antecedente que guste declarar?",
    seccion: "Antecedentes médicos",
  },
  {
    key: "antecedentes_medicos_cual",
    tipo: "paciente_texto",
    pregunta: "¿Cuál?",
    seccion: "Antecedentes médicos",
    mostrarSi: (_f, _edad, dp) => dp.antecedentes_medicos === true,
  },
];
