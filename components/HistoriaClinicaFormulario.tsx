import { useState } from "react";
import {
  Activity, Briefcase, Cake, CalendarDays, ChevronDown, CircleDot, ClipboardList, HeartPulse, IdCard, Leaf, MapPin,
  MessageSquare, Phone, Pill, ShieldAlert, Smile, Stethoscope, User, Users, Venus
} from "lucide-react";
import type { HistoriaClinica } from "@/lib/types";
import { fechaSoloDia, hoyISO } from "@/lib/fechas";

export type FormStateHistoriaClinica = Omit<HistoriaClinica, "actualizado_en">;

export const HISTORIA_CLINICA_VACIA: FormStateHistoriaClinica = {
  fecha: hoyISO(),
  sexo: null,
  nombre_padre_tutor: null,
  domicilio: null,
  codigo_postal: null,
  ciudad: null,
  estado: null,
  pais: "México",
  ocupacion: null,
  emergencia_nombre: null,
  emergencia_telefono: null,
  emergencia_parentesco: null,
  motivo_consulta: null,
  fam_enfermedad_sistemica: null,
  fam_enfermedad_cual: null,
  enfermedad_actual: null,
  enfermedad_actual_cual: null,
  toma_medicamento: null,
  toma_medicamento_cual: null,
  alergico_medicamento: null,
  alergico_medicamento_cual: null,
  alergico_anestesico: null,
  alergico_anestesico_cual: null,
  cirugia_previa: null,
  cirugia_previa_cual: null,
  problemas_sangrado: null,
  embarazada: null,
  lactancia: null,
  consume_alcohol: null,
  consume_tabaco: null,
  ets: null,
  ets_cual: null,
  fam_detalle: null,
  esquema_vacunacion: null,
  otros_antecedentes: null,
  tipo_alimentacion: null,
  cepilla_dientes: null,
  cepilla_momento: null,
  higiene_utiliza: null,
  cepillo_consistencia: null,
  bruxismo: null,
  ejercicio: null,
  ultima_consulta_dentista: null,
  motivo_ultima_consulta: null,
  ansiedad_dental: null,
  ansiedad_dental_descripcion: null,
  tratamientos_previos: null,
  traumatismos_dentales: null,
  traumatismos_dentales_cual: null,
  ta: null,
  fc: null,
  fr: null,
  temperatura: null,
  peso_exploracion: null,
  talla: null,
  cabeza_cara_normal: null,
  cabeza_cara_hallazgos: null,
  atm: null,
  ganglios_cuello_normal: null,
  ganglios_cuello_hallazgos: null,
  labios_mucosa_normal: null,
  labios_mucosa_hallazgos: null,
  lengua_piso_boca_normal: null,
  lengua_piso_boca_hallazgos: null,
  paladar_orofaringe_normal: null,
  paladar_orofaringe_hallazgos: null,
  encia_periodonto: null,
};

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

// Parentescos que pueden marcarse como "No aplica".
export const PARENTESCOS_NO_APLICA: readonly string[] = ["Hermanos", "Hijos"];
// Parentescos que no preguntan "vive / finado": solo "Sí aplica" o "No aplica".
export const PARENTESCOS_SOLO_APLICA: readonly string[] = ["Primos", "Tíos"];

// fam_detalle se guarda como JSON en un solo TEXT (cifrado) — estos
// helpers evitan repetir el parse/serialize en cada lugar que lo usa.
export function parsearFamDetalle(json: string | null): FamiliarDetalle[] {
  if (!json) return PARENTESCOS_FAMILIA.map((parentesco) => ({ parentesco, vive: null, enfermedades: null }));
  try {
    const datos: FamiliarDetalle[] = JSON.parse(json);
    return PARENTESCOS_FAMILIA.map(
      (parentesco) => datos.find((d) => d.parentesco === parentesco) ?? { parentesco, vive: null, enfermedades: null }
    );
  } catch {
    return PARENTESCOS_FAMILIA.map((parentesco) => ({ parentesco, vive: null, enfermedades: null }));
  }
}

export function serializarFamDetalle(lista: FamiliarDetalle[]): string | null {
  const conDatos = lista.filter((f) => f.vive !== null || f.enfermedades || f.no_aplica || f.si_aplica);
  return conDatos.length > 0 ? JSON.stringify(lista) : null;
}

// Grupos de checkboxes guardados como "valor1,valor2" en un solo TEXT.
export function listaDesdeTexto(texto: string | null): string[] {
  return texto ? texto.split(",").filter(Boolean) : [];
}
export function textoDesdeLista(lista: string[]): string | null {
  return lista.length > 0 ? lista.join(",") : null;
}

export function calcularEdad(fechaNacimiento: string | null) {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = fechaSoloDia(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad--;
  // Una fecha de nacimiento en el futuro no es válida (típicamente un
  // error de captura, p. ej. el selector de fecha se quedó en el año
  // actual) — mostrar "—" en vez de una edad negativa sin sentido.
  return edad < 0 ? null : edad;
}

function iconoDeSeccion(titulo: string) {
  const p = { size: 22, className: "shrink-0 text-[#7A1E33]", strokeWidth: 1.9 };
  switch (titulo) {
    case "Ficha de identificación":
      return <IdCard {...p} />;
    case "Antecedentes heredofamiliares":
      return <Users {...p} />;
    case "Antecedentes personales":
      return <HeartPulse {...p} />;
    case "Antecedentes personales no patológicos":
      return <Leaf {...p} />;
    case "Antecedentes odontológicos":
      return <Smile {...p} />;
    case "Exploración física y signos vitales":
      return <Activity {...p} />;
    case "Cabeza, cuello y cavidad bucal":
      return <Stethoscope {...p} />;
    default:
      return <ClipboardList {...p} />;
  }
}

// Sección plegable con ícono guinda en el encabezado.
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [abierta, setAbierta] = useState(true);
  return (
    <div className="rounded-[28px] border border-[#EFE9DC] bg-white/80 p-5 shadow-[0_10px_30px_-18px_rgba(122,30,51,0.35)]">
      <button type="button" onClick={() => setAbierta((v) => !v)} className="flex w-full items-center gap-3 text-left">
        {iconoDeSeccion(titulo)}
        <span className="flex-1 text-[17px] font-bold text-[#7A1E33]">{titulo}</span>
        <ChevronDown size={18} className={`shrink-0 text-[#7A1E33] transition-transform ${abierta ? "rotate-180" : ""}`} />
      </button>
      {abierta && <div className="mt-5 space-y-5">{children}</div>}
    </div>
  );
}

// Ícono de cada campo según su etiqueta.
function iconoDeCampo(label: string) {
  const p = { size: 16, className: "shrink-0 text-[#7A1E33]", strokeWidth: 1.8 };
  const l = label.toLowerCase();
  if (l === "fecha") return <CalendarDays {...p} />;
  if (l.includes("nacimiento")) return <Cake {...p} />;
  if (l === "edad") return <Cake {...p} />;
  if (l.includes("teléfono") || l.includes("telefono")) return <Phone {...p} />;
  if (l.includes("nombre del paciente")) return <User {...p} />;
  if (l.includes("padre") || l.includes("tutor")) return <Users {...p} />;
  if (l.includes("calle") || l.includes("ciudad") || l.includes("estado") || l.includes("país") || l.includes("postal")) return <MapPin {...p} />;
  if (l === "sexo") return <Venus {...p} />;
  if (l.includes("ocupaci")) return <Briefcase {...p} />;
  if (l.includes("motivo")) return <MessageSquare {...p} />;
  if (l.includes("alerg")) return <ShieldAlert {...p} />;
  if (l.includes("medicamento")) return <Pill {...p} />;
  if (l.includes("cepill") || l.includes("dent") || l.includes("higiene")) return <Smile {...p} />;
  return <CircleDot {...p} />;
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-[#7b6f64]">
        {iconoDeCampo(label)}
        <span className="min-w-0">{label}</span>
      </label>
      {children}
    </div>
  );
}

const inputClase =
  "w-full rounded-2xl border border-[#EFE9DC] bg-white px-4 py-2.5 text-[15px] text-[#2b2118] outline-none placeholder:text-[#b8b0a0] focus:border-[#7A1E33]";

// Mismo tamaño/caja que un input, pero de solo lectura (dato que viene
// del paciente, no se edita aquí) — para que no se vea "chueco" al
// lado de un campo editable real dentro del mismo grid.
const soloLecturaClase =
  "w-full rounded-2xl border border-[#EFE9DC] bg-[#FBF9F4] px-4 py-2.5 text-[15px] text-[#2b2118]";

export function SiNo({
  valor,
  onChange,
}: {
  valor: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold ${
          valor === true ? "border-[#3F6B33] bg-[#E8F0E3] text-[#3F6B33]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
        }`}
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold ${
          valor === false ? "border-[#B0503A] bg-[#F7E5E0] text-[#B0503A]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
        }`}
      >
        No
      </button>
    </div>
  );
}

export type FrecuenciaConsumo = "si" | "a_veces" | "no";

function SiAVecesNo({
  valor,
  onChange,
}: {
  valor: FrecuenciaConsumo | null;
  onChange: (v: FrecuenciaConsumo) => void;
}) {
  const opciones: { valor: FrecuenciaConsumo; label: string; activo: string }[] = [
    { valor: "si", label: "Sí", activo: "border-[#3F6B33] bg-[#E8F0E3] text-[#3F6B33]" },
    { valor: "a_veces", label: "A veces", activo: "border-[#B08A3F] bg-[#F5EDDD] text-[#8A6A22]" },
    { valor: "no", label: "No", activo: "border-[#B0503A] bg-[#F7E5E0] text-[#B0503A]" },
  ];
  return (
    <div className="flex gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold ${
            valor === o.valor ? o.activo : "border-[#EFE9DC] bg-white text-[#8a8272]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Selector de una sola opción con etiquetas propias — igual look que
// SiNo/SiAVecesNo pero para listas arbitrarias (tipo de alimentación,
// consistencia del cepillo…).
export function Opciones<V extends string>({
  valor,
  opciones,
  onChange,
}: {
  valor: V | null;
  opciones: { valor: V; label: string }[];
  onChange: (v: V) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold ${
            valor === o.valor ? "border-[#2b2118] bg-[#2b2118] text-white" : "border-[#EFE9DC] bg-white text-[#8a8272]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Selector de varias opciones a la vez (checkboxes como pills) —
// cepilla_momento, higiene_utiliza, tratamientos_previos…
export function MultiSelect({
  seleccionados,
  opciones,
  onChange,
  exclusiva,
}: {
  seleccionados: string[];
  opciones: { valor: string; label: string }[];
  onChange: (lista: string[]) => void;
  // Opción que no se combina con las demás (ej. "No recuerdo").
  exclusiva?: string;
}) {
  function alternar(valor: string) {
    if (seleccionados.includes(valor)) {
      onChange(seleccionados.filter((v) => v !== valor));
    } else if (exclusiva && valor === exclusiva) {
      onChange([valor]);
    } else {
      onChange([...seleccionados.filter((v) => v !== exclusiva), valor]);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const activo = seleccionados.includes(o.valor);
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => alternar(o.valor)}
            className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold ${
              activo ? "border-[#7C5CE0] bg-[#EFE3F0] text-[#7A4D8A]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Cuadro de antecedentes heredofamiliares: ¿vive? + enfermedades por
// cada parentesco, igual que la tabla del formulario en papel.
export function TablaFamiliares({
  valor,
  onChange,
  parentescos,
}: {
  valor: FamiliarDetalle[];
  onChange: (lista: FamiliarDetalle[]) => void;
  // Si se pasa, solo se muestran esos parentescos (el wizard reparte la
  // tabla en varias pantallas para que no haya que hacer scroll).
  parentescos?: readonly string[];
}) {
  function actualizar(parentesco: string, cambios: Partial<FamiliarDetalle>) {
    onChange(valor.map((f) => (f.parentesco === parentesco ? { ...f, ...cambios } : f)));
  }
  return (
    <div className="space-y-2">
      {valor
        .filter((f) => {
          // La fila antigua "Abuelos" ya no se muestra (se reemplazó por
          // abuelos maternos y paternos); su dato queda guardado.
          if (f.parentesco === "Abuelos") return false;
          return !parentescos || parentescos.includes(f.parentesco);
        })
        .map((f) => (
        <div key={f.parentesco} className="rounded-xl border border-[#EFE9DC] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-[#2b2118]">{f.parentesco}</span>
            <div className="flex gap-1.5">
              {PARENTESCOS_SOLO_APLICA.includes(f.parentesco) && (
                <button
                  type="button"
                  onClick={() => actualizar(f.parentesco, f.si_aplica ? { si_aplica: false } : { si_aplica: true, no_aplica: false })}
                  className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
                    f.si_aplica ? "border-[#3F6B33] bg-[#E8F0E3] text-[#3F6B33]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
                  }`}
                >
                  Sí aplica
                </button>
              )}
              {(PARENTESCOS_NO_APLICA.includes(f.parentesco) || PARENTESCOS_SOLO_APLICA.includes(f.parentesco)) && (
                <button
                  type="button"
                  onClick={() =>
                    actualizar(
                      f.parentesco,
                      f.no_aplica ? { no_aplica: false } : { no_aplica: true, si_aplica: false, vive: null, enfermedades: null }
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
                    f.no_aplica ? "border-[#7A1E33] bg-[#7A1E33] text-white" : "border-[#EFE9DC] bg-white text-[#8a8272]"
                  }`}
                >
                  No aplica
                </button>
              )}
              {!PARENTESCOS_SOLO_APLICA.includes(f.parentesco) && (
                <>
                  <button
                    type="button"
                    disabled={f.no_aplica}
                    onClick={() => actualizar(f.parentesco, { vive: true, no_aplica: false })}
                    className={`rounded-full border px-3 py-1 text-[12px] font-semibold disabled:opacity-40 ${
                      f.vive === true ? "border-[#3F6B33] bg-[#E8F0E3] text-[#3F6B33]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
                    }`}
                  >
                    Vive
                  </button>
                  <button
                    type="button"
                    disabled={f.no_aplica}
                    onClick={() => actualizar(f.parentesco, { vive: false, no_aplica: false })}
                    className={`rounded-full border px-3 py-1 text-[12px] font-semibold disabled:opacity-40 ${
                      f.vive === false ? "border-[#B0503A] bg-[#F7E5E0] text-[#B0503A]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
                    }`}
                  >
                    Finado
                  </button>
                </>
              )}
            </div>
          </div>
          <input
            value={f.enfermedades ?? ""}
            disabled={f.no_aplica || (PARENTESCOS_SOLO_APLICA.includes(f.parentesco) && !f.si_aplica)}
            onChange={(e) => actualizar(f.parentesco, { enfermedades: e.target.value || null })}
            placeholder={PARENTESCOS_SOLO_APLICA.includes(f.parentesco) ? "¿Qué enfermedad? (si aplica)" : "Enfermedades (si aplica)"}
            className="mt-2 w-full rounded-lg border border-[#EFE9DC] bg-white px-2.5 py-1.5 text-[13px] text-[#2b2118] outline-none focus:border-[#803449] disabled:opacity-40"
          />
        </div>
      ))}
    </div>
  );
}

// Patrón "Normal / hay hallazgos" de la exploración física — un
// interruptor Normal/Hallazgos y, si no es normal, un campo de texto.
export function NormalHallazgos({
  normal,
  hallazgos,
  onChangeNormal,
  onChangeHallazgos,
}: {
  normal: boolean | null;
  hallazgos: string | null;
  onChangeNormal: (v: boolean) => void;
  onChangeHallazgos: (v: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChangeNormal(true)}
          className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold ${
            normal === true ? "border-[#3F6B33] bg-[#E8F0E3] text-[#3F6B33]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
          }`}
        >
          Normal
        </button>
        <button
          type="button"
          onClick={() => onChangeNormal(false)}
          className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold ${
            normal === false ? "border-[#B0503A] bg-[#F7E5E0] text-[#B0503A]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
          }`}
        >
          Hay hallazgos
        </button>
      </div>
      {normal === false && (
        <input
          value={hallazgos ?? ""}
          onChange={(e) => onChangeHallazgos(e.target.value || null)}
          placeholder="Describe el hallazgo"
          className={inputClase}
        />
      )}
    </div>
  );
}

export function CamposHistoriaClinica({
  form,
  set,
  pacienteNombre,
  pacienteFechaNacimiento,
  pacienteTelefono,
}: {
  form: FormStateHistoriaClinica;
  set: <K extends keyof FormStateHistoriaClinica>(campo: K, valor: FormStateHistoriaClinica[K]) => void;
  pacienteNombre: string;
  pacienteFechaNacimiento: string | null;
  pacienteTelefono: string | null;
}) {
  const edad = calcularEdad(pacienteFechaNacimiento);

  return (
    <>
      <Seccion titulo="Ficha de identificación">
        <Campo label="Nombre del paciente">
          <div className={soloLecturaClase}>{pacienteNombre}</div>
        </Campo>
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0 [&>*]:overflow-hidden">
          <Campo label="Fecha">
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => set("fecha", e.target.value)}
              className={`${inputClase} block h-[46px] min-w-0 max-w-full appearance-none text-left [&::-webkit-date-and-time-value]:text-left [&::-webkit-datetime-edit]:p-0`}
            />
          </Campo>
          <Campo label="Fecha de nacimiento">
            <div className={soloLecturaClase}>
              {pacienteFechaNacimiento ? fechaSoloDia(pacienteFechaNacimiento).toLocaleDateString("es-MX") : "—"}
            </div>
          </Campo>
          <Campo label="Edad">
            <div className={soloLecturaClase}>{edad ?? "—"}</div>
          </Campo>
          <Campo label="Teléfono">
            <div className={soloLecturaClase}>{pacienteTelefono || "—"}</div>
          </Campo>
        </div>
        <Campo label="Sexo">
          <div className="flex gap-2">
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
                className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold ${
                  form.sexo === s ? "border-[#2b2118] bg-[#2b2118] text-white" : "border-[#EFE9DC] bg-white text-[#8a8272]"
                }`}
              >
                {s === "F" ? "Femenino" : "Masculino"}
              </button>
            ))}
          </div>
        </Campo>

        <Campo label="Nombre del padre o tutor (si es menor de edad)">
          <input
            value={form.nombre_padre_tutor ?? ""}
            onChange={(e) => set("nombre_padre_tutor", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
        <Campo label="Calle y número">
          <input
            value={form.domicilio ?? ""}
            onChange={(e) => set("domicilio", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Código postal">
            <input
              value={form.codigo_postal ?? ""}
              onChange={(e) => set("codigo_postal", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
          <Campo label="Ciudad">
            <input
              value={form.ciudad ?? ""}
              onChange={(e) => set("ciudad", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
          <Campo label="Estado">
            <input
              value={form.estado ?? ""}
              onChange={(e) => set("estado", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
          <Campo label="País">
            <input
              value={form.pais ?? ""}
              onChange={(e) => set("pais", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
        </div>
        <Campo label="Ocupación">
          <input
            value={form.ocupacion ?? ""}
            onChange={(e) => set("ocupacion", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="En caso de emergencia llamar a">
            <input
              value={form.emergencia_nombre ?? ""}
              onChange={(e) => set("emergencia_nombre", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
          <Campo label="Teléfono de emergencia">
            <input
              value={form.emergencia_telefono ?? ""}
              onChange={(e) => set("emergencia_telefono", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
          <Campo label="Parentesco">
            <input
              value={form.emergencia_parentesco ?? ""}
              onChange={(e) => set("emergencia_parentesco", e.target.value || null)}
              placeholder="Ej. mamá, esposo…"
              className={inputClase}
            />
          </Campo>
        </div>
        <Campo label="Motivo de consulta">
          <input
            value={form.motivo_consulta ?? ""}
            onChange={(e) => set("motivo_consulta", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Antecedentes heredofamiliares">
        <Campo label="Hipertensión arterial, diabetes, tuberculosis, sífilis, herpes, hepatitis, VIH, artritis reumatoide, cáncer, infartos, alergias, enfermedades psiquiátricas…">
          <TablaFamiliares valor={parsearFamDetalle(form.fam_detalle)} onChange={(v) => set("fam_detalle", serializarFamDetalle(v))} />
        </Campo>
        <Campo label="¿Familiares con alguna otra enfermedad sistémica?">
          <SiNo valor={form.fam_enfermedad_sistemica} onChange={(v) => set("fam_enfermedad_sistemica", v)} />
        </Campo>
        {form.fam_enfermedad_sistemica === true && (
          <Campo label="¿Cuál o cuáles?">
            <input
              value={form.fam_enfermedad_cual ?? ""}
              onChange={(e) => set("fam_enfermedad_cual", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
        )}
      </Seccion>

      <Seccion titulo="Antecedentes personales">
        <Campo label="¿Enfermedad actual presente?">
          <SiNo valor={form.enfermedad_actual} onChange={(v) => set("enfermedad_actual", v)} />
        </Campo>
        {form.enfermedad_actual === true && (
          <Campo label="¿Cuál?">
            <input
              value={form.enfermedad_actual_cual ?? ""}
              onChange={(e) => set("enfermedad_actual_cual", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
        )}
        <Campo label="¿Toma algún medicamento?">
          <SiNo valor={form.toma_medicamento} onChange={(v) => set("toma_medicamento", v)} />
        </Campo>
        {form.toma_medicamento === true && (
          <Campo label="¿Cuál?">
            <input
              value={form.toma_medicamento_cual ?? ""}
              onChange={(e) => set("toma_medicamento_cual", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
        )}
        <Campo label="¿Alérgico a algún medicamento?">
          <SiNo valor={form.alergico_medicamento} onChange={(v) => set("alergico_medicamento", v)} />
        </Campo>
        {form.alergico_medicamento === true && (
          <Campo label="¿Cuál?">
            <input
              value={form.alergico_medicamento_cual ?? ""}
              onChange={(e) => set("alergico_medicamento_cual", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
        )}
        <Campo label="¿Alérgico a algún anestésico?">
          <SiNo valor={form.alergico_anestesico} onChange={(v) => set("alergico_anestesico", v)} />
        </Campo>
        {form.alergico_anestesico === true && (
          <Campo label="¿Cuál?">
            <input
              value={form.alergico_anestesico_cual ?? ""}
              onChange={(e) => set("alergico_anestesico_cual", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
        )}
        <Campo label="¿Ha sido intervenido quirúrgicamente?">
          <SiNo valor={form.cirugia_previa} onChange={(v) => set("cirugia_previa", v)} />
        </Campo>
        {form.cirugia_previa === true && (
          <Campo label="¿De qué?">
            <input
              value={form.cirugia_previa_cual ?? ""}
              onChange={(e) => set("cirugia_previa_cual", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
        )}
        <Campo label="¿Presenta problemas de sangrado o cicatrización?">
          <SiNo valor={form.problemas_sangrado} onChange={(v) => set("problemas_sangrado", v)} />
        </Campo>
        {form.sexo === "F" && (
          <>
            <Campo label="¿Está embarazada?">
              <SiNo valor={form.embarazada} onChange={(v) => set("embarazada", v)} />
            </Campo>
            <Campo label="¿Está en periodo de lactancia?">
              <SiNo valor={form.lactancia} onChange={(v) => set("lactancia", v)} />
            </Campo>
          </>
        )}
        <Campo label="Esquema de vacunación">
          <Opciones
            valor={form.esquema_vacunacion === true ? "completo" : form.esquema_vacunacion === false ? "incompleto" : null}
            opciones={[
              { valor: "completo", label: "Completo" },
              { valor: "incompleto", label: "Incompleto" },
            ]}
            onChange={(v) => set("esquema_vacunacion", v === "completo")}
          />
        </Campo>
        <Campo label="Otros antecedentes relevantes">
          <input
            value={form.otros_antecedentes ?? ""}
            onChange={(e) => set("otros_antecedentes", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Antecedentes personales no patológicos">
        <Campo label="¿Consume alcohol?">
          <SiAVecesNo valor={form.consume_alcohol} onChange={(v) => set("consume_alcohol", v)} />
        </Campo>
        <Campo label="¿Consume tabaco?">
          <SiAVecesNo valor={form.consume_tabaco} onChange={(v) => set("consume_tabaco", v)} />
        </Campo>
        <Campo label="¿Enfermedades de transmisión sexual (VIH/VPH)?">
          <SiNo valor={form.ets} onChange={(v) => set("ets", v)} />
        </Campo>
        {form.ets === true && (
          <Campo label="¿Cuál?">
            <input
              value={form.ets_cual ?? ""}
              onChange={(e) => set("ets_cual", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
        )}
        <Campo label="Tipo de alimentación">
          <Opciones
            valor={form.tipo_alimentacion}
            opciones={[
              { valor: "vegetariana", label: "Vegetariana" },
              { valor: "vegana", label: "Vegana" },
              { valor: "mixta", label: "Mixta" },
              { valor: "sin_restricciones", label: "Sin restricciones" },
            ]}
            onChange={(v) => set("tipo_alimentacion", v)}
          />
        </Campo>
        <Campo label="¿Se cepilla los dientes?">
          <SiNo valor={form.cepilla_dientes} onChange={(v) => set("cepilla_dientes", v)} />
        </Campo>
        {form.cepilla_dientes === true && (
          <Campo label="¿Cuándo?">
            <MultiSelect
              seleccionados={listaDesdeTexto(form.cepilla_momento)}
              opciones={[
                { valor: "manana", label: "Mañana" },
                { valor: "tarde", label: "Tarde" },
                { valor: "noche", label: "Noche" },
              ]}
              onChange={(v) => set("cepilla_momento", textoDesdeLista(v))}
            />
          </Campo>
        )}
        <Campo label="Utiliza">
          <MultiSelect
            seleccionados={listaDesdeTexto(form.higiene_utiliza)}
            opciones={[
              { valor: "pasta_dental", label: "Pasta dental" },
              { valor: "hilo_dental", label: "Hilo dental" },
              { valor: "enjuague", label: "Enjuague" },
              { valor: "cepillo", label: "Cepillo" },
            ]}
            onChange={(v) => set("higiene_utiliza", textoDesdeLista(v))}
          />
        </Campo>
        <Campo label="Consistencia del cepillo">
          <Opciones
            valor={form.cepillo_consistencia}
            opciones={[
              { valor: "suave", label: "Suave" },
              { valor: "mediano", label: "Mediano" },
              { valor: "duro", label: "Duro" },
            ]}
            onChange={(v) => set("cepillo_consistencia", v)}
          />
        </Campo>
        <Campo label="¿Bruxismo (aprieta o rechina los dientes)?">
          <SiNo valor={form.bruxismo} onChange={(v) => set("bruxismo", v)} />
        </Campo>
        <Campo label="¿Realiza algún tipo de ejercicio?">
          <input
            value={form.ejercicio ?? ""}
            onChange={(e) => set("ejercicio", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Antecedentes odontológicos">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Última consulta con el dentista">
            <input
              value={form.ultima_consulta_dentista ?? ""}
              onChange={(e) => set("ultima_consulta_dentista", e.target.value || null)}
              placeholder="Ej. hace 6 meses"
              className={`${inputClase} min-w-0`}
            />
          </Campo>
          <Campo label="Motivo">
            <input
              value={form.motivo_ultima_consulta ?? ""}
              onChange={(e) => set("motivo_ultima_consulta", e.target.value || null)}
              className={`${inputClase} min-w-0`}
            />
          </Campo>
        </div>
        <Campo label="¿Ansiedad o mala experiencia dental?">
          <SiNo valor={form.ansiedad_dental} onChange={(v) => set("ansiedad_dental", v)} />
        </Campo>
        {form.ansiedad_dental === true && (
          <Campo label="Descripción">
            <input
              value={form.ansiedad_dental_descripcion ?? ""}
              onChange={(e) => set("ansiedad_dental_descripcion", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
        )}
        <Campo label="Tratamientos previos">
          <MultiSelect
            seleccionados={listaDesdeTexto(form.tratamientos_previos)}
            opciones={[
              { valor: "ortodoncia", label: "Ortodoncia" },
              { valor: "endodoncia", label: "Endodoncia" },
              { valor: "cirugia", label: "Cirugía" },
              { valor: "protesis", label: "Prótesis" },
              { valor: "implantes", label: "Implantes" },
              { valor: "periodoncia", label: "Periodoncia" },
              { valor: "no_recuerda", label: "No recuerdo" },
            ]}
            exclusiva="no_recuerda"
            onChange={(v) => set("tratamientos_previos", textoDesdeLista(v))}
          />
        </Campo>
        <Campo label="¿Traumatismos dentales?">
          <SiNo valor={form.traumatismos_dentales} onChange={(v) => set("traumatismos_dentales", v)} />
        </Campo>
        {form.traumatismos_dentales === true && (
          <Campo label="¿Cuáles y cuándo?">
            <input
              value={form.traumatismos_dentales_cual ?? ""}
              onChange={(e) => set("traumatismos_dentales_cual", e.target.value || null)}
              className={inputClase}
            />
          </Campo>
        )}
      </Seccion>
    </>
  );
}

// Exploración física/signos vitales y cabeza-cuello-cavidad bucal —
// SOLO la llena la doctora en consulta (nunca el paciente): es una
// sección aparte, deliberadamente no incluida en CamposHistoriaClinica
// de arriba, que mezcla ambos mundos; el dashboard la agrega por
// separado (ver app/dashboard/pacientes/[id]/historia-clinica).
export function CamposExploracionFisica({
  form,
  set,
}: {
  form: FormStateHistoriaClinica;
  set: <K extends keyof FormStateHistoriaClinica>(campo: K, valor: FormStateHistoriaClinica[K]) => void;
}) {
  return (
    <>
      <Seccion titulo="Exploración física y signos vitales">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="T.A. (mmHg)">
            <input value={form.ta ?? ""} onChange={(e) => set("ta", e.target.value || null)} className={`${inputClase} min-w-0`} />
          </Campo>
          <Campo label="F.C. (lpm)">
            <input value={form.fc ?? ""} onChange={(e) => set("fc", e.target.value || null)} className={`${inputClase} min-w-0`} />
          </Campo>
          <Campo label="F.R. (rpm)">
            <input value={form.fr ?? ""} onChange={(e) => set("fr", e.target.value || null)} className={`${inputClase} min-w-0`} />
          </Campo>
          <Campo label="Temp. (°C)">
            <input
              value={form.temperatura ?? ""}
              onChange={(e) => set("temperatura", e.target.value || null)}
              className={`${inputClase} min-w-0`}
            />
          </Campo>
          <Campo label="Peso (kg)">
            <input
              value={form.peso_exploracion ?? ""}
              onChange={(e) => set("peso_exploracion", e.target.value || null)}
              className={`${inputClase} min-w-0`}
            />
          </Campo>
          <Campo label="Talla (cm)">
            <input value={form.talla ?? ""} onChange={(e) => set("talla", e.target.value || null)} className={`${inputClase} min-w-0`} />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Cabeza, cuello y cavidad bucal">
        <Campo label="Cabeza / cara">
          <NormalHallazgos
            normal={form.cabeza_cara_normal}
            hallazgos={form.cabeza_cara_hallazgos}
            onChangeNormal={(v) => set("cabeza_cara_normal", v)}
            onChangeHallazgos={(v) => set("cabeza_cara_hallazgos", v)}
          />
        </Campo>
        <Campo label="ATM">
          <MultiSelect
            seleccionados={listaDesdeTexto(form.atm)}
            opciones={[
              { valor: "normal", label: "Normal" },
              { valor: "dolor", label: "Dolor" },
              { valor: "chasquidos", label: "Chasquidos" },
              { valor: "crepitacion", label: "Crepitación" },
              { valor: "limitaciones", label: "Limitaciones" },
            ]}
            onChange={(v) => set("atm", textoDesdeLista(v))}
          />
        </Campo>
        <Campo label="Ganglios / cuello">
          <NormalHallazgos
            normal={form.ganglios_cuello_normal}
            hallazgos={form.ganglios_cuello_hallazgos}
            onChangeNormal={(v) => set("ganglios_cuello_normal", v)}
            onChangeHallazgos={(v) => set("ganglios_cuello_hallazgos", v)}
          />
        </Campo>
        <Campo label="Labios / mucosa">
          <NormalHallazgos
            normal={form.labios_mucosa_normal}
            hallazgos={form.labios_mucosa_hallazgos}
            onChangeNormal={(v) => set("labios_mucosa_normal", v)}
            onChangeHallazgos={(v) => set("labios_mucosa_hallazgos", v)}
          />
        </Campo>
        <Campo label="Lengua / piso de boca">
          <NormalHallazgos
            normal={form.lengua_piso_boca_normal}
            hallazgos={form.lengua_piso_boca_hallazgos}
            onChangeNormal={(v) => set("lengua_piso_boca_normal", v)}
            onChangeHallazgos={(v) => set("lengua_piso_boca_hallazgos", v)}
          />
        </Campo>
        <Campo label="Paladar / orofaringe">
          <NormalHallazgos
            normal={form.paladar_orofaringe_normal}
            hallazgos={form.paladar_orofaringe_hallazgos}
            onChangeNormal={(v) => set("paladar_orofaringe_normal", v)}
            onChangeHallazgos={(v) => set("paladar_orofaringe_hallazgos", v)}
          />
        </Campo>
        <Campo label="Encía / periodonto">
          <MultiSelect
            seleccionados={listaDesdeTexto(form.encia_periodonto)}
            opciones={[
              { valor: "normal", label: "Normal" },
              { valor: "gingivitis", label: "Gingivitis" },
              { valor: "periodontitis", label: "Periodontitis" },
              { valor: "recesion", label: "Recesión" },
              { valor: "movilidad", label: "Movilidad" },
            ]}
            onChange={(v) => set("encia_periodonto", textoDesdeLista(v))}
          />
        </Campo>
      </Seccion>
    </>
  );
}
