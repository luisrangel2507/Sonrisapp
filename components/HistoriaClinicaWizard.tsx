"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, HeartPulse, IdCard, Leaf, Pencil, Save, Smile, Stethoscope, Users, type LucideIcon } from "lucide-react";
import { DOCTORA } from "@/lib/panel-data";
import { fechaSoloDia, hoyISO } from "@/lib/fechas";
import {
  calcularEdad,
  listaDesdeTexto,
  parsearFamDetalle,
  serializarFamDetalle,
  textoDesdeLista,
  TablaFamiliares,
  MultiSelect,
  Opciones,
  type FormStateHistoriaClinica,
  type FrecuenciaConsumo,
} from "@/components/HistoriaClinicaFormulario";

type Seccion =
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
type Paso =
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
      mostrarSi?: (f: FormStateHistoriaClinica, edad: number | null, datosPaciente: DatosPacienteWizard) => boolean;
    };

const PASOS: Paso[] = [
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
    pregunta: "Abuelos: ¿viven? ¿alguna enfermedad?",
    seccion: "Antecedentes heredofamiliares",
    parentescos: ["Abuelos"],
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
    ],
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

const SECCIONES: Seccion[] = [
  "Ficha de identificación",
  "Antecedentes heredofamiliares",
  "Antecedentes personales",
  "Antecedentes personales no patológicos",
  "Antecedentes odontológicos",
  "Antecedentes médicos",
];

// Páginas del cuestionario: cada página debe caber en la pantalla del
// celular sin scroll. Se agrupan preguntas de una misma sección hasta
// llenar un alto estimado (px). Las preguntas condicionales ("¿cuál?")
// reservan su espacio en la página de la pregunta que las abre, para que
// la pantalla no crezca al contestar.
const ALTO_PAGINA = 430;
// Mínimo de preguntas por página (domicilio, contacto de emergencia y la
// tabla de familiares cuentan por sus campos). Si no caben sin scroll,
// se prefiere un poco de scroll antes que una página con menos de 3.
const MIN_PREGUNTAS = 3;

function altoEstimado(p: Paso): number {
  const largo = p.pregunta.length > 42 ? 20 : 0;
  switch (p.tipo) {
    case "domicilio":
    case "emergencia":
      return 297;
    case "familiares":
      return 70 + (p.parentescos?.length ?? 7) * 100;
    case "opciones":
    case "multi":
      return 90 + largo + Math.ceil(p.opciones.length / 2) * 44;
    default:
      // Las condicionales ("¿Cuál?") van dentro de la tarjeta de su
      // pregunta; solo se reserva un poco de espacio por si aparecen.
      return p.mostrarSi ? 36 : 105 + largo;
  }
}

function pesoPregunta(p: Paso): number {
  if (p.mostrarSi) return 0; // las condicionales no cuentan
  if (p.tipo === "domicilio" || p.tipo === "emergencia") return 3;
  if (p.tipo === "familiares") return (p.parentescos?.length ?? 7) * 2; // vive + enfermedades
  return 1;
}

// Cada grupo es una pregunta con sus condicionales (las que vienen justo
// después): siempre van juntas.
const GRUPOS: Paso[][] = (() => {
  const grupos: Paso[][] = [];
  for (const p of PASOS) {
    if (p.mostrarSi && grupos.length > 0) grupos[grupos.length - 1].push(p);
    else grupos.push([p]);
  }
  return grupos;
})();

// "Antecedentes médicos" tiene solo 2 preguntas: para cumplir el mínimo de
// 3 por página se pagina junto con la sección anterior.
function seccionPaginacion(p: Paso): Seccion {
  return p.seccion === "Antecedentes médicos" ? "Antecedentes odontológicos" : p.seccion;
}

const PAGINAS: Paso[][] = (() => {
  const altoGrupo = (g: Paso[]) => g.reduce((t, p) => t + altoEstimado(p), 0);
  const pesoGrupos = (gs: Paso[][]) => gs.reduce((t, g) => t + pesoPregunta(g[0]), 0);

  let paginas: Paso[][][] = [];
  let actual: Paso[][] = [];
  let alto = 0;
  for (const g of GRUPOS) {
    const h = altoGrupo(g);
    const cambia = actual.length > 0 && seccionPaginacion(actual[0][0]) !== seccionPaginacion(g[0]);
    if (actual.length > 0 && (cambia || (pesoGrupos(actual) >= MIN_PREGUNTAS && alto + h > ALTO_PAGINA))) {
      paginas.push(actual);
      actual = [];
      alto = 0;
    }
    actual.push(g);
    alto += h;
  }
  if (actual.length) paginas.push(actual);

  // Si la última página de una sección se queda con menos de 3 preguntas,
  // se reparte toda la sección en páginas parejas (cada una con 3 o más).
  const final: Paso[][][] = [];
  let k = 0;
  while (k < paginas.length) {
    const seccion = seccionPaginacion(paginas[k][0][0]);
    let fin = k;
    while (fin + 1 < paginas.length && seccionPaginacion(paginas[fin + 1][0][0]) === seccion) fin++;
    const delSeccion = paginas.slice(k, fin + 1);
    const ultima = delSeccion[delSeccion.length - 1];
    if (pesoGrupos(ultima) >= MIN_PREGUNTAS || delSeccion.length === 1) {
      final.push(...delSeccion);
    } else {
      const grupos = delSeccion.flat();
      const total = pesoGrupos(grupos);
      const n = Math.max(1, Math.floor(total / MIN_PREGUNTAS));
      const meta = total / n;
      let actualPag: Paso[][] = [];
      let acum = 0;
      for (const g of grupos) {
        actualPag.push(g);
        acum += pesoPregunta(g[0]);
        if (acum >= meta - 0.01 && final.length - (final.length - 0) >= 0 && actualPag.length > 0 && acum >= MIN_PREGUNTAS) {
          final.push(actualPag);
          actualPag = [];
          acum = 0;
        }
      }
      if (actualPag.length) {
        if (final.length > 0 && seccionPaginacion(final[final.length - 1][0][0]) === seccion && pesoGrupos(actualPag) < MIN_PREGUNTAS) final[final.length - 1].push(...actualPag);
        else final.push(actualPag);
      }
    }
    k = fin + 1;
  }
  paginas = final;
  return paginas.map((pag) => pag.flat());
})();

const ICONO_SECCION: Record<Seccion, LucideIcon> = {
  "Ficha de identificación": IdCard,
  "Antecedentes heredofamiliares": Users,
  "Antecedentes personales": HeartPulse,
  "Antecedentes personales no patológicos": Leaf,
  "Antecedentes odontológicos": Smile,
  "Antecedentes médicos": Stethoscope,
};

const GUINDA = "#7A1E33";

function EtiquetaPregunta({ pregunta }: { pregunta: string }) {
  return (
    <h2 className="text-[15px] font-bold leading-snug" style={{ fontFamily: "Georgia, serif", color: GUINDA }}>
      {pregunta}
    </h2>
  );
}

function BotonSiNo({ valor, onChange }: { valor: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 rounded-2xl border-2 py-2 text-base font-semibold transition-colors ${
          valor === true ? "border-[#3F6B33] bg-[#E8F0E3] text-[#3F6B33]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
        }`}
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 rounded-2xl border-2 py-2 text-base font-semibold transition-colors ${
          valor === false ? "border-[#B0503A] bg-[#F7E5E0] text-[#B0503A]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
        }`}
      >
        No
      </button>
    </div>
  );
}

function BotonSiAVecesNo({ valor, onChange }: { valor: FrecuenciaConsumo | null; onChange: (v: FrecuenciaConsumo) => void }) {
  const opciones: { valor: FrecuenciaConsumo; label: string; activo: string }[] = [
    { valor: "si", label: "Sí", activo: "border-[#3F6B33] bg-[#E8F0E3] text-[#3F6B33]" },
    { valor: "a_veces", label: "A veces", activo: "border-[#B08A3F] bg-[#F5EDDD] text-[#8A6A22]" },
    { valor: "no", label: "No", activo: "border-[#B0503A] bg-[#F7E5E0] text-[#B0503A]" },
  ];
  return (
    <div className="flex gap-3">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={`flex-1 rounded-2xl border-2 py-2 text-base font-semibold transition-colors ${
            valor === o.valor ? o.activo : "border-[#EFE9DC] bg-white text-[#8a8272]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function valorLegible(paso: Paso, form: FormStateHistoriaClinica, datosPaciente: DatosPacienteWizard): string {
  if (paso.tipo === "fecha_nacimiento") return "—";
  if (paso.tipo === "emergencia") {
    const partes = [form.emergencia_nombre, form.emergencia_telefono, form.emergencia_parentesco].filter(Boolean);
    return partes.length ? partes.join(" · ") : "—";
  }
  if (paso.tipo === "domicilio") {
    const partes = [form.domicilio, form.codigo_postal, form.ciudad, form.estado, form.pais].filter(Boolean);
    return partes.length ? partes.join(", ") : "—";
  }
  if (paso.tipo === "frecuencia") {
    const v = form[paso.key];
    return v === "si" ? "Sí" : v === "a_veces" ? "A veces" : v === "no" ? "No" : "—";
  }
  if (paso.tipo === "paciente_bool") {
    const v = datosPaciente[paso.key];
    return v === true ? "Sí" : v === false ? "No" : "—";
  }
  if (paso.tipo === "paciente_texto") {
    return (datosPaciente[paso.key] as string | null) || "—";
  }
  if (paso.tipo === "familiares") {
    const lista = parsearFamDetalle(form.fam_detalle).filter((f) => f.vive !== null || f.enfermedades || f.no_aplica || f.si_aplica);
    return lista.length ? lista.map((f) => `${f.parentesco}: ${f.no_aplica ? "no aplica" : f.si_aplica ? "sí aplica" : f.vive === true ? "vive" : f.vive === false ? "finado" : "—"}`).join(" · ") : "—";
  }
  if (paso.tipo === "opciones") {
    if (paso.key === "esquema_vacunacion") {
      return form.esquema_vacunacion === true ? "Completo" : form.esquema_vacunacion === false ? "Incompleto" : "—";
    }
    const v = form[paso.key] as string | null;
    return paso.opciones.find((o) => o.valor === v)?.label ?? "—";
  }
  if (paso.tipo === "multi") {
    const lista = listaDesdeTexto(form[paso.key] as string | null);
    if (lista.length === 0) return "—";
    return lista.map((v) => paso.opciones.find((o) => o.valor === v)?.label ?? v).join(", ");
  }
  const v = form[paso.key];
  if (paso.tipo === "sexo") return v === "F" ? "Femenino" : v === "M" ? "Masculino" : "—";
  if (paso.tipo === "bool") return v === true ? "Sí" : v === false ? "No" : "—";
  return (v as string | null) || "—";
}

export function HistoriaClinicaWizard({
  form,
  set,
  pacienteNombre,
  pacienteFechaNacimiento,
  onChangeFechaNacimiento,
  datosPaciente,
  onChangeDatosPaciente,
  onEnviar,
  guardando,
  error,
}: {
  form: FormStateHistoriaClinica;
  set: <K extends keyof FormStateHistoriaClinica>(campo: K, valor: FormStateHistoriaClinica[K]) => void;
  pacienteNombre: string;
  pacienteFechaNacimiento: string | null;
  onChangeFechaNacimiento: (v: string | null) => void;
  datosPaciente: DatosPacienteWizard;
  onChangeDatosPaciente: <K extends keyof DatosPacienteWizard>(campo: K, valor: DatosPacienteWizard[K]) => void;
  onEnviar: () => void;
  guardando: boolean;
  error: string;
}) {
  // vista === "intro": pantalla de bienvenida
  // vista === "pregunta": una pregunta a la vez, avanza con pasoIndex
  // vista === "resumen": revisión final antes de confirmar
  const [vista, setVista] = useState<"intro" | "pregunta" | "resumen">("intro");
  const [pasoIndex, setPasoIndex] = useState(0);
  // Insignia de "nivel completado" al pasar a una sección nueva.
  const [insignia, setInsignia] = useState<Seccion | null>(null);
  useEffect(() => {
    if (!insignia) return;
    const t = setTimeout(() => setInsignia(null), 1600);
    return () => clearTimeout(t);
  }, [insignia]);

  const edad = calcularEdad(pacienteFechaNacimiento);
  const pasosVisibles = PASOS.filter((p) => !p.mostrarSi || p.mostrarSi(form, edad, datosPaciente));

  function irASiguiente(total: number) {
    if (pasoIndex + 1 >= total) {
      setVista("resumen");
    } else {
      setPasoIndex(pasoIndex + 1);
    }
  }

  function irAAnterior() {
    if (pasoIndex === 0) {
      setVista("intro");
    } else {
      setPasoIndex(pasoIndex - 1);
    }
  }

  function editarSeccion(seccion: Seccion) {
    const idx = PAGINAS.map((pag) => pag.filter((p) => !p.mostrarSi || p.mostrarSi(form, edad, datosPaciente)))
      .filter((pag) => pag.length > 0)
      .findIndex((pag) => pag.some((p) => p.seccion === seccion));
    setPasoIndex(idx === -1 ? 0 : idx);
    setVista("pregunta");
  }

  if (vista === "intro") {
    return (
      <div className="relative flex min-h-dvh flex-col overflow-hidden" style={{ background: "#F7EFE7" }}>
        {/* Decoración de la portada: parra arriba, diente y ondas abajo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/historia-intro-arriba.webp" alt="" aria-hidden className="pointer-events-none absolute inset-x-0 top-0 w-full"
          style={{ maskImage: "linear-gradient(to bottom, #000 70%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, #000 70%, transparent)" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/historia-intro-abajo.webp" alt="" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
          style={{ maskImage: "linear-gradient(to top, #000 70%, transparent)", WebkitMaskImage: "linear-gradient(to top, #000 70%, transparent)" }}
        />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-40 pt-32 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-vina-sonrisas.webp" alt="Viña Sonrisas" className="mx-auto h-auto w-72" />
          <div className="mt-8 text-[12px] font-semibold uppercase tracking-[0.35em] text-[#B08A78]">Historia clínica</div>
          <div className="mx-auto mt-3 h-px w-16 bg-[#7A1E33]" />
          <div className="mt-3 text-[19px] font-bold text-[#5A1426]" style={{ fontFamily: "Georgia, serif" }}>
            {DOCTORA.nombre}
          </div>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-[#6f6458]">
            Hola <b className="text-[#5A1426]">{pacienteNombre.split(" ")[0]}</b>, vamos a completar tu ficha antes de tu cita — nos
            ayuda a atenderte mejor. Es rápido: unas cuantas preguntas por pantalla.
          </p>
          <div className="mt-5 text-[12px] text-[#a49c8a]">~5 minutos</div>
          <button
            onClick={() => setVista("pregunta")}
            className="mt-7 flex items-center gap-2 rounded-full px-10 py-4 text-[16px] font-semibold text-white shadow-[0_14px_28px_-10px_rgba(90,20,38,0.75)]"
            style={{ background: "linear-gradient(180deg, #8E2340 0%, #6A1429 100%)" }}
          >
            Comenzar <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (vista === "resumen") {
    return (
      <div className="min-h-dvh px-5 py-8">
        <div className="mx-auto max-w-md">
          <h2 className="text-xl font-bold text-[#2b2118]" style={{ fontFamily: "Georgia, serif" }}>
            Revisa tu información
          </h2>
          <p className="mt-1 text-sm text-[#8a8272]">
            Antes de enviar, confirma que todo esté correcto. Puedes editar cualquier sección.
          </p>

          <div className="mt-5 rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#803449]">
              Ficha de identificación
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[11px] text-[#a49c8a]">Nombre</div>
                <div className="text-[#2b2118]">{pacienteNombre}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#a49c8a]">Fecha de nacimiento</div>
                <div className="text-[#2b2118]">
                  {pacienteFechaNacimiento ? fechaSoloDia(pacienteFechaNacimiento).toLocaleDateString("es-MX") : "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#a49c8a]">Edad</div>
                <div className="text-[#2b2118]">{edad ?? "—"}</div>
              </div>
            </div>
          </div>

          {SECCIONES.map((seccion) => {
            // La fecha de nacimiento ya se muestra arriba, en el bloque
            // de "Ficha de identificación" — no se repite en la lista.
            const pasosSeccion = pasosVisibles.filter((p) => p.seccion === seccion && p.tipo !== "fecha_nacimiento" && !(p.tipo === "familiares" && p.parentescos?.[0] !== "Madre"));
            if (pasosSeccion.length === 0) return null;
            return (
              <div key={seccion} className="mt-4 rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#803449]">{seccion}</div>
                  <button
                    onClick={() => editarSeccion(seccion)}
                    className="flex items-center gap-1 text-[12px] font-medium text-[#803449]"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                </div>
                <div className="space-y-2.5">
                  {pasosSeccion.map((p) => (
                    <div key={p.key}>
                      <div className="text-[11px] text-[#a49c8a]">{p.pregunta}</div>
                      <div className="text-sm text-[#2b2118]">{valorLegible(p, form, datosPaciente)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {error && <p className="mt-4 text-center text-sm text-[#B0503A]">{error}</p>}

          <button
            onClick={onEnviar}
            disabled={guardando}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#7A1E33] py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
          >
            <Save size={16} /> {guardando ? "Enviando…" : "Mi información es correcta, enviar"}
          </button>
          <button
            onClick={() => {
              setPasoIndex(0);
              setVista("pregunta");
            }}
            className="mt-3 flex w-full items-center justify-center gap-1 text-[13px] font-medium text-[#8a8272]"
          >
            <ArrowLeft size={13} /> Volver a las preguntas
          </button>
        </div>
      </div>
    );
  }

  // vista === "pregunta": una página con varias preguntas
  const campo = (paso: Paso) => (
paso.tipo === "sexo" ? (
    <div className="flex gap-3">
      {(["F", "M"] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => {
            set("sexo", s);
            if (s === "M") {
              set("embarazada", null);
              set("lactancia", null);
            }
          }}
          className={`flex-1 rounded-2xl border-2 py-2 text-base font-semibold transition-colors ${
            form.sexo === s ? "border-[#7A1E33] bg-[#7A1E33] text-white" : "border-[#EFE9DC] bg-white text-[#8a8272]"
          }`}
        >
          {s === "F" ? "Femenino" : "Masculino"}
        </button>
      ))}
    </div>
  ) : paso.tipo === "bool" ? (
    <BotonSiNo
      valor={form[paso.key] as boolean | null}
      onChange={(v) => set(paso.key, v as FormStateHistoriaClinica[typeof paso.key])}
    />
  ) : paso.tipo === "frecuencia" ? (
    <BotonSiAVecesNo
      valor={form[paso.key] as FrecuenciaConsumo | null}
      onChange={(v) => set(paso.key, v as FormStateHistoriaClinica[typeof paso.key])}
    />
  ) : paso.tipo === "paciente_bool" ? (
    <BotonSiNo
      valor={datosPaciente[paso.key] as boolean | null}
      onChange={(v) => onChangeDatosPaciente(paso.key, v as DatosPacienteWizard[typeof paso.key])}
    />
  ) : paso.tipo === "paciente_texto" ? (
    <input
                    type={paso.inputType ?? "text"}
      value={(datosPaciente[paso.key] as string | null) ?? ""}
      onChange={(e) => onChangeDatosPaciente(paso.key, (e.target.value || null) as DatosPacienteWizard[typeof paso.key])}
      placeholder="Escribe tu respuesta…"
      className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-2.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
    />
  ) : paso.tipo === "familiares" ? (
    <TablaFamiliares
      parentescos={paso.parentescos}
      valor={parsearFamDetalle(form.fam_detalle)}
      onChange={(v) => set("fam_detalle", serializarFamDetalle(v))}
    />
  ) : paso.tipo === "opciones" ? (
    paso.key === "esquema_vacunacion" ? (
      <Opciones
        valor={form.esquema_vacunacion === true ? "completo" : form.esquema_vacunacion === false ? "incompleto" : null}
        opciones={paso.opciones}
        onChange={(v) => set("esquema_vacunacion", v === "completo")}
      />
    ) : (
      <Opciones
        valor={form[paso.key] as string | null}
        opciones={paso.opciones}
        onChange={(v) => set(paso.key, v as FormStateHistoriaClinica[typeof paso.key])}
      />
    )
  ) : paso.tipo === "multi" ? (
    <MultiSelect
      seleccionados={listaDesdeTexto(form[paso.key] as string | null)}
      opciones={paso.opciones}
      onChange={(v) => set(paso.key, textoDesdeLista(v) as FormStateHistoriaClinica[typeof paso.key])}
    />
  ) : paso.tipo === "fecha_nacimiento" ? (
    <input
                    type="date"
      value={pacienteFechaNacimiento ?? ""}
      max={hoyISO()}
      onChange={(e) => onChangeFechaNacimiento(e.target.value || null)}
      className="block h-12 w-full min-w-0 max-w-full appearance-none rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-2.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
    />
  ) : paso.tipo === "emergencia" ? (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Nombre</label>
        <input
                            value={form.emergencia_nombre ?? ""}
          onChange={(e) => set("emergencia_nombre", e.target.value || null)}
          placeholder="Nombre de la persona"
          className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-2.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Número telefónico</label>
        <input
          type="tel"
          value={form.emergencia_telefono ?? ""}
          onChange={(e) => set("emergencia_telefono", e.target.value || null)}
          placeholder="Número de contacto"
          className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-2.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Parentesco</label>
        <input
          value={form.emergencia_parentesco ?? ""}
          onChange={(e) => set("emergencia_parentesco", e.target.value || null)}
          placeholder="Ej. mamá, esposo…"
          className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-2.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
        />
      </div>
    </div>
  ) : paso.tipo === "domicilio" ? (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Calle y número</label>
        <input
                            value={form.domicilio ?? ""}
          onChange={(e) => set("domicilio", e.target.value || null)}
          className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-2.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Código postal</label>
          <input
            value={form.codigo_postal ?? ""}
            onChange={(e) => set("codigo_postal", e.target.value || null)}
            className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-2.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Ciudad</label>
          <input
            value={form.ciudad ?? ""}
            onChange={(e) => set("ciudad", e.target.value || null)}
            className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-2.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Estado</label>
          <input
            value={form.estado ?? ""}
            onChange={(e) => set("estado", e.target.value || null)}
            className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-2.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">País</label>
          <input
            value={form.pais ?? ""}
            onChange={(e) => set("pais", e.target.value || null)}
            className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-2.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
          />
        </div>
      </div>
    </div>
  ) : (
    <input
                    value={(form[paso.key] as string | null) ?? ""}
      onChange={(e) => set(paso.key, (e.target.value || null) as FormStateHistoriaClinica[typeof paso.key])}
      placeholder="Escribe tu respuesta…"
      className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-2.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
    />
  )
  );

  const paginas = PAGINAS.map((pag) => pag.filter((p) => !p.mostrarSi || p.mostrarSi(form, edad, datosPaciente))).filter(
    (pag) => pag.length > 0
  );
  const pagina = paginas[Math.min(pasoIndex, paginas.length - 1)];
  const progreso = ((pasoIndex + 1) / paginas.length) * 100;
  const Icono = ICONO_SECCION[pagina[0].seccion];
  const ultima = pasoIndex + 1 >= paginas.length;
  const secciones = SECCIONES.filter((sec) => paginas.some((pag) => pag[0].seccion === sec));
  const nivelActual = Math.max(0, secciones.indexOf(pagina[0].seccion));
  const restantes = paginas.length - pasoIndex;

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-hidden px-4 py-4"
      style={{ background: "linear-gradient(180deg, #F8F1EC 0%, #F3E6E1 100%)" }}
    >
      {/* Decoración de fondo */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#EFD9D3]/70 blur-2xl" />
      <div className="pointer-events-none absolute -right-28 top-1/3 h-80 w-80 rounded-full border border-[#E3C6BE]" />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
        style={{ background: "radial-gradient(120% 90% at 0% 100%, rgba(122,30,51,0.22) 0%, rgba(122,30,51,0) 60%)" }}
      />

      <div className="relative mx-auto w-full max-w-md">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#E9DCD6]">
          <div className="h-full rounded-full transition-all" style={{ width: `${progreso}%`, background: GUINDA }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12px] font-medium" style={{ color: GUINDA }}>
          <span>
            Nivel {nivelActual + 1} de {secciones.length} · Página {pasoIndex + 1} de {paginas.length}
          </span>
          <span className="text-[#a49c8a]">
            {restantes <= 1 ? "¡Última página!" : `~${Math.max(1, Math.round((restantes * 12) / 60))} min`}
          </span>
        </div>
        {/* Caminito de niveles */}
        <div className="mt-2 flex items-center">
          {secciones.map((sec, i) => {
            const I = ICONO_SECCION[sec];
            const hecho = i < nivelActual;
            const actualN = i === nivelActual;
            return (
              <div key={sec} className="flex flex-1 items-center last:flex-none">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all ${
                    hecho ? "bg-[#7A1E33] text-white" : actualN ? "scale-110 bg-white text-[#7A1E33] ring-2 ring-[#7A1E33]" : "bg-[#EADAD5] text-[#B99AA2]"
                  }`}
                >
                  {hecho ? <Check size={15} /> : <I size={15} />}
                </div>
                {i < secciones.length - 1 && <div className={`mx-1 h-0.5 flex-1 rounded ${hecho ? "bg-[#7A1E33]" : "bg-[#EADAD5]"}`} />}
              </div>
            );
          })}
        </div>
        {nivelActual > 0 && nivelActual === Math.floor(secciones.length / 2) && pagina[0].seccion !== paginas[pasoIndex - 1]?.[0].seccion && (
          <div className="mt-3 text-center text-[13px] font-semibold text-[#7A1E33]">¡Vas a la mitad! 💪</div>
        )}
      </div>

      {insignia && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-[insignia_1.6s_ease-out_forwards] rounded-3xl bg-white px-8 py-6 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#7A1E33] text-white">
              <Check size={30} />
            </div>
            <div className="mt-3 text-[17px] font-bold text-[#7A1E33]" style={{ fontFamily: "Georgia, serif" }}>
              ¡Nivel completado!
            </div>
            <div className="text-[12px] text-[#8a8272]">{insignia}</div>
          </div>
          <style>{`@keyframes insignia{0%{opacity:0;transform:scale(.6)}15%{opacity:1;transform:scale(1.05)}25%{transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(.95)}}`}</style>
        </div>
      )}

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col py-3">
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-[0_8px_18px_-6px_rgba(122,30,51,0.55)]"
            style={{ background: `radial-gradient(circle at 30% 25%, #9B3048, ${GUINDA} 70%)` }}
          >
            <Icono size={20} className="text-white" strokeWidth={1.8} />
          </div>
          <h1 className="text-[20px] font-bold leading-tight" style={{ fontFamily: "Georgia, serif", color: GUINDA }}>
            {pagina[0].seccion}
          </h1>
        </div>

        <div className="space-y-2">
          {pagina
            .reduce<Paso[][]>((grupos, paso) => {
              // Las condicionales ("¿Cuál?") van dentro de la tarjeta de su pregunta.
              if (paso.mostrarSi && grupos.length > 0) grupos[grupos.length - 1].push(paso);
              else grupos.push([paso]);
              return grupos;
            }, [])
            .map((grupo) => (
              <div
                key={String(grupo[0].key) + grupo[0].tipo + grupo[0].pregunta}
                className="rounded-3xl bg-white/85 p-3 shadow-[0_8px_24px_-12px_rgba(122,30,51,0.25)] backdrop-blur"
              >
                <EtiquetaPregunta pregunta={grupo[0].pregunta} />
                <div className="mt-2">{campo(grupo[0])}</div>
                {grupo.slice(1).map((cond) => (
                  <div key={String(cond.key) + cond.pregunta} className="mt-2">
                    <div className="mb-1 text-[12px] font-medium text-[#8a8272]">{cond.pregunta}</div>
                    {campo(cond)}
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-md gap-3 pb-1 pt-2">
        <button
          onClick={irAAnterior}
          className="flex items-center justify-center gap-1.5 rounded-full border-2 border-[#E3B9C1] bg-white/80 px-6 py-3.5 text-[15px] font-semibold"
          style={{ color: GUINDA }}
        >
          <ArrowLeft size={16} /> Atrás
        </button>
        <button
          onClick={() => {
            const siguiente = paginas[pasoIndex + 1];
            if (siguiente && siguiente[0].seccion !== pagina[0].seccion) setInsignia(pagina[0].seccion);
            navigator.vibrate?.(15);
            irASiguiente(paginas.length);
            window.scrollTo({ top: 0 });
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(122,30,51,0.8)]"
          style={{ background: GUINDA }}
        >
          {ultima ? (
            <>
              Ver resumen <Check size={16} />
            </>
          ) : (
            <>
              Siguiente <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
