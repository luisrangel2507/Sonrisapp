"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Pencil, Save } from "lucide-react";
import { DOCTORA } from "@/lib/panel-data";
import { fechaSoloDia, hoyISO } from "@/lib/fechas";
import { calcularEdad, type FormStateHistoriaClinica, type FrecuenciaConsumo } from "@/components/HistoriaClinicaFormulario";

type Seccion =
  | "Ficha de identificación"
  | "Antecedentes heredofamiliares"
  | "Antecedentes personales"
  | "Antecedentes personales no patológicos"
  | "Antecedentes médicos";

// Alergias/antecedentes médicos generales viven en la tabla pacientes
// (no en historia_clinica), así que no forman parte de
// FormStateHistoriaClinica — el wizard los maneja aparte, igual que ya
// hace con fecha_nacimiento.
export interface DatosPacienteWizard {
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
    key: "nombre_padre_tutor",
    tipo: "texto",
    pregunta: "Nombre del padre o tutor",
    seccion: "Ficha de identificación",
    // Solo aplica si es menor de edad — si no se sabe la edad (no
    // contestó la fecha de nacimiento), se asume que no aplica.
    mostrarSi: (_f, edad) => edad !== null && edad < 18,
  },
  { key: "domicilio", tipo: "domicilio", pregunta: "¿Cuál es tu domicilio?", seccion: "Ficha de identificación" },
  { key: "ocupacion", tipo: "texto", pregunta: "¿Cuál es tu ocupación?", seccion: "Ficha de identificación" },
  {
    key: "emergencia",
    tipo: "emergencia",
    pregunta: "En caso de emergencia, ¿a quién llamamos?",
    seccion: "Ficha de identificación",
  },
  {
    key: "motivo_consulta",
    tipo: "texto",
    pregunta: "¿Cuál es el motivo de tu consulta?",
    seccion: "Ficha de identificación",
  },
  {
    key: "fam_enfermedad_sistemica",
    tipo: "bool",
    pregunta: "¿Algún familiar tiene alguna enfermedad sistémica?",
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
  "Antecedentes médicos",
];

function EtiquetaPregunta({ pregunta }: { pregunta: string }) {
  return (
    <h2 className="text-xl font-semibold leading-snug text-[#2b2118]" style={{ fontFamily: "Georgia, serif" }}>
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
        className={`flex-1 rounded-2xl border-2 py-4 text-base font-semibold transition-colors ${
          valor === true ? "border-[#3F6B33] bg-[#E8F0E3] text-[#3F6B33]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
        }`}
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 rounded-2xl border-2 py-4 text-base font-semibold transition-colors ${
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
          className={`flex-1 rounded-2xl border-2 py-4 text-base font-semibold transition-colors ${
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
  pacienteTelefono,
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
  pacienteTelefono: string | null;
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

  const edad = calcularEdad(pacienteFechaNacimiento);
  const pasosVisibles = PASOS.filter((p) => !p.mostrarSi || p.mostrarSi(form, edad, datosPaciente));

  function irASiguiente() {
    if (pasoIndex + 1 >= pasosVisibles.length) {
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
    const idx = pasosVisibles.findIndex((p) => p.seccion === seccion);
    setPasoIndex(idx === -1 ? 0 : idx);
    setVista("pregunta");
  }

  if (vista === "intro") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-vina-sonrisas.png" alt="Viña Sonrisas" className="mx-auto h-auto w-56" />
        <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">Historia clínica</div>
        <div className="mt-1 text-sm font-medium text-[#2b2118]">{DOCTORA.nombre}</div>
        <p className="mt-4 max-w-xs text-[15px] text-[#8a8272]">
          Hola {pacienteNombre.split(" ")[0]}, vamos a completar tu ficha antes de tu cita — nos ayuda a atenderte
          mejor. Es rápido: una pregunta a la vez.
        </p>
        <button
          onClick={() => setVista("pregunta")}
          className="mt-8 flex items-center gap-2 rounded-full bg-[#2b2118] px-8 py-3.5 text-[15px] font-semibold text-white"
        >
          Comenzar <ArrowRight size={16} />
        </button>
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
              <div>
                <div className="text-[11px] text-[#a49c8a]">Teléfono</div>
                <div className="text-[#2b2118]">{pacienteTelefono || "—"}</div>
              </div>
            </div>
          </div>

          {SECCIONES.map((seccion) => {
            // La fecha de nacimiento ya se muestra arriba, en el bloque
            // de "Ficha de identificación" — no se repite en la lista.
            const pasosSeccion = pasosVisibles.filter((p) => p.seccion === seccion && p.tipo !== "fecha_nacimiento");
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
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
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

  // vista === "pregunta"
  const paso = pasosVisibles[Math.min(pasoIndex, pasosVisibles.length - 1)];
  const progreso = ((pasoIndex + 1) / pasosVisibles.length) * 100;

  return (
    <div className="flex min-h-dvh flex-col px-5 py-6">
      <div className="mx-auto w-full max-w-md">
        <div className="h-1 w-full overflow-hidden rounded-full bg-[#EFE9DC]">
          <div className="h-full rounded-full bg-[#803449] transition-all" style={{ width: `${progreso}%` }} />
        </div>
        <div className="mt-2 text-[11px] text-[#a49c8a]">
          Pregunta {pasoIndex + 1} de {pasosVisibles.length}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <EtiquetaPregunta pregunta={paso.pregunta} />

        <div className="mt-6">
          {paso.tipo === "sexo" ? (
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
                  className={`flex-1 rounded-2xl border-2 py-4 text-base font-semibold transition-colors ${
                    form.sexo === s ? "border-[#2b2118] bg-[#2b2118] text-white" : "border-[#EFE9DC] bg-white text-[#8a8272]"
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
              autoFocus
              value={(datosPaciente[paso.key] as string | null) ?? ""}
              onChange={(e) => onChangeDatosPaciente(paso.key, (e.target.value || null) as DatosPacienteWizard[typeof paso.key])}
              placeholder="Escribe tu respuesta…"
              className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-3.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
            />
          ) : paso.tipo === "fecha_nacimiento" ? (
            <input
              autoFocus
              type="date"
              value={pacienteFechaNacimiento ?? ""}
              max={hoyISO()}
              onChange={(e) => onChangeFechaNacimiento(e.target.value || null)}
              className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-3.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
            />
          ) : paso.tipo === "emergencia" ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Nombre</label>
                <input
                  autoFocus
                  value={form.emergencia_nombre ?? ""}
                  onChange={(e) => set("emergencia_nombre", e.target.value || null)}
                  placeholder="Nombre de la persona"
                  className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-3.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Número telefónico</label>
                <input
                  type="tel"
                  value={form.emergencia_telefono ?? ""}
                  onChange={(e) => set("emergencia_telefono", e.target.value || null)}
                  placeholder="Número de contacto"
                  className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-3.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Parentesco</label>
                <input
                  value={form.emergencia_parentesco ?? ""}
                  onChange={(e) => set("emergencia_parentesco", e.target.value || null)}
                  placeholder="Ej. mamá, esposo…"
                  className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-3.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
                />
              </div>
            </div>
          ) : paso.tipo === "domicilio" ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Calle y número</label>
                <input
                  autoFocus
                  value={form.domicilio ?? ""}
                  onChange={(e) => set("domicilio", e.target.value || null)}
                  className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-3.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Código postal</label>
                  <input
                    value={form.codigo_postal ?? ""}
                    onChange={(e) => set("codigo_postal", e.target.value || null)}
                    className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-3.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Ciudad</label>
                  <input
                    value={form.ciudad ?? ""}
                    onChange={(e) => set("ciudad", e.target.value || null)}
                    className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-3.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">Estado</label>
                  <input
                    value={form.estado ?? ""}
                    onChange={(e) => set("estado", e.target.value || null)}
                    className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-3.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#8a8272]">País</label>
                  <input
                    value={form.pais ?? ""}
                    onChange={(e) => set("pais", e.target.value || null)}
                    className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-3.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <input
              autoFocus
              value={(form[paso.key] as string | null) ?? ""}
              onChange={(e) => set(paso.key, (e.target.value || null) as FormStateHistoriaClinica[typeof paso.key])}
              placeholder="Escribe tu respuesta…"
              className="w-full rounded-2xl border-2 border-[#EFE9DC] bg-white px-4 py-3.5 text-base text-[#2b2118] outline-none focus:border-[#803449]"
            />
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md gap-3">
        <button
          onClick={irAAnterior}
          className="flex items-center justify-center gap-1.5 rounded-full border border-[#EFE9DC] bg-white px-5 py-3 text-[14px] font-semibold text-[#2b2118]"
        >
          <ArrowLeft size={15} /> Atrás
        </button>
        <button
          onClick={irASiguiente}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#2b2118] py-3 text-[14px] font-semibold text-white"
        >
          {pasoIndex + 1 >= pasosVisibles.length ? (
            <>
              Ver resumen <Check size={15} />
            </>
          ) : (
            <>
              Siguiente <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
