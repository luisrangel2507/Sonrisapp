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
export const PARENTESCOS_FAMILIA = ["Madre", "Padre", "Hermanos", "Hijos", "Primos", "Tíos", "Abuelos"] as const;

export interface FamiliarDetalle {
  parentesco: string;
  vive: boolean | null;
  enfermedades: string | null;
}

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
  const conDatos = lista.filter((f) => f.vive !== null || f.enfermedades);
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

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#803449]">{titulo}</div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-[11px] font-medium text-[#a49c8a]">{label}</label>
      {children}
    </div>
  );
}

const inputClase =
  "w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm text-[#2b2118] outline-none focus:border-[#803449]";

// Mismo tamaño/caja que un input, pero de solo lectura (dato que viene
// del paciente, no se edita aquí) — para que no se vea "chueco" al
// lado de un campo editable real dentro del mismo grid.
const soloLecturaClase =
  "w-full rounded-xl border border-[#EFE9DC] bg-[#FBF9F4] px-3 py-2 text-sm text-[#2b2118]";

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
}: {
  seleccionados: string[];
  opciones: { valor: string; label: string }[];
  onChange: (lista: string[]) => void;
}) {
  function alternar(valor: string) {
    onChange(
      seleccionados.includes(valor) ? seleccionados.filter((v) => v !== valor) : [...seleccionados, valor]
    );
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
}: {
  valor: FamiliarDetalle[];
  onChange: (lista: FamiliarDetalle[]) => void;
}) {
  function actualizar(parentesco: string, cambios: Partial<FamiliarDetalle>) {
    onChange(valor.map((f) => (f.parentesco === parentesco ? { ...f, ...cambios } : f)));
  }
  return (
    <div className="space-y-2">
      {valor.map((f) => (
        <div key={f.parentesco} className="rounded-xl border border-[#EFE9DC] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-[#2b2118]">{f.parentesco}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => actualizar(f.parentesco, { vive: true })}
                className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
                  f.vive === true ? "border-[#3F6B33] bg-[#E8F0E3] text-[#3F6B33]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
                }`}
              >
                Vive
              </button>
              <button
                type="button"
                onClick={() => actualizar(f.parentesco, { vive: false })}
                className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
                  f.vive === false ? "border-[#B0503A] bg-[#F7E5E0] text-[#B0503A]" : "border-[#EFE9DC] bg-white text-[#8a8272]"
                }`}
              >
                Finado
              </button>
            </div>
          </div>
          <input
            value={f.enfermedades ?? ""}
            onChange={(e) => actualizar(f.parentesco, { enfermedades: e.target.value || null })}
            placeholder="Enfermedades (si aplica)"
            className="mt-2 w-full rounded-lg border border-[#EFE9DC] bg-white px-2.5 py-1.5 text-[13px] text-[#2b2118] outline-none focus:border-[#803449]"
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
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Fecha">
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => set("fecha", e.target.value)}
              className={`${inputClase} min-w-0`}
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
            ]}
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
