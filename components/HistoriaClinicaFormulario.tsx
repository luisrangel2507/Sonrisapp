import type { HistoriaClinica } from "@/lib/types";
import { fechaSoloDia, hoyISO } from "@/lib/fechas";

export type FormStateHistoriaClinica = Omit<HistoriaClinica, "actualizado_en">;

export const HISTORIA_CLINICA_VACIA: FormStateHistoriaClinica = {
  fecha: hoyISO(),
  sexo: null,
  nombre_padre_tutor: null,
  domicilio: null,
  ocupacion: null,
  emergencia_nombre: null,
  emergencia_telefono: null,
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
};

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
    <div>
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

function SiNo({
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
              className={inputClase}
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
        <Campo label="Domicilio">
          <input
            value={form.domicilio ?? ""}
            onChange={(e) => set("domicilio", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
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
        <Campo label="¿Familiares con alguna enfermedad sistémica?">
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
      </Seccion>
    </>
  );
}
