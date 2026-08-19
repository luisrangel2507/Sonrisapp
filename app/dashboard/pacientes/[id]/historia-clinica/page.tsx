"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save } from "lucide-react";
import type { HistoriaClinica, Paciente } from "@/lib/types";
import { DOCTORA } from "@/lib/panel-data";

type FormState = Omit<HistoriaClinica, "actualizado_en">;

const VACIO: FormState = {
  fecha: new Date().toISOString().slice(0, 10),
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
  toma_medicamento: null,
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

function calcularEdad(fechaNacimiento: string | null) {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad--;
  return edad;
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#C96F3B]">{titulo}</div>
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
  "w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm text-[#2b2118] outline-none focus:border-[#C96F3B]";

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

export default function HistoriaClinicaPage() {
  const params = useParams<{ id: string }>();
  const pacienteId = Number(params.id);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [form, setForm] = useState<FormState>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  useEffect(() => {
    if (!Number.isInteger(pacienteId)) return;
    Promise.all([
      fetch(`/api/pacientes/${pacienteId}`).then((r) => r.json()),
      fetch(`/api/pacientes/${pacienteId}/historia-clinica`).then((r) => r.json()),
    ]).then(([dataPaciente, dataHc]) => {
      setPaciente(dataPaciente.paciente ?? null);
      if (dataHc.historiaClinica) {
        setForm({ ...VACIO, ...dataHc.historiaClinica, fecha: dataHc.historiaClinica.fecha.slice(0, 10) });
      }
      setCargando(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  async function guardar() {
    setGuardando(true);
    setGuardado(false);
    await fetch(`/api/pacientes/${pacienteId}/historia-clinica`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  if (cargando || !paciente) {
    return <p className="mx-4 mt-6 text-sm text-[#8a8272]">Cargando…</p>;
  }

  const edad = calcularEdad(paciente.fecha_nacimiento);

  return (
    <div className="mx-4 mt-2 space-y-4 pb-10">
      <Link
        href={`/dashboard/pacientes/${pacienteId}`}
        className="inline-flex items-center gap-1 text-sm text-[#8a8272]"
      >
        <ChevronLeft size={15} /> {paciente.nombre}
      </Link>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">Historia clínica</div>
        <div className="mt-1 text-sm font-medium text-[#2b2118]">{DOCTORA.nombre}</div>
        <div className="text-xs text-[#a49c8a]">Cédula profesional: {DOCTORA.cedula}</div>
      </div>

      <Seccion titulo="Ficha de identificación">
        <Campo label="Nombre del paciente">
          <div className="text-sm text-[#2b2118]">{paciente.nombre}</div>
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
            <div className="text-sm text-[#2b2118]">
              {paciente.fecha_nacimiento ? new Date(paciente.fecha_nacimiento).toLocaleDateString("es-MX") : "—"}
            </div>
          </Campo>
          <Campo label="Edad">
            <div className="text-sm text-[#2b2118]">{edad ?? "—"}</div>
          </Campo>
          <Campo label="Teléfono">
            <div className="text-sm text-[#2b2118]">{paciente.telefono || "—"}</div>
          </Campo>
        </div>
        <Campo label="Sexo">
          <div className="flex gap-2">
            {(["F", "M"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("sexo", s)}
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
        <Campo label="¿Cuál o cuáles?">
          <input
            value={form.fam_enfermedad_cual ?? ""}
            onChange={(e) => set("fam_enfermedad_cual", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Antecedentes personales">
        <Campo label="¿Enfermedad actual presente?">
          <input
            value={form.enfermedad_actual ?? ""}
            onChange={(e) => set("enfermedad_actual", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
        <Campo label="¿Toma algún medicamento?">
          <input
            value={form.toma_medicamento ?? ""}
            onChange={(e) => set("toma_medicamento", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
        <Campo label="¿Alérgico a algún medicamento?">
          <SiNo valor={form.alergico_medicamento} onChange={(v) => set("alergico_medicamento", v)} />
        </Campo>
        <Campo label="¿Cuál?">
          <input
            value={form.alergico_medicamento_cual ?? ""}
            onChange={(e) => set("alergico_medicamento_cual", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
        <Campo label="¿Alérgico a algún anestésico?">
          <SiNo valor={form.alergico_anestesico} onChange={(v) => set("alergico_anestesico", v)} />
        </Campo>
        <Campo label="¿Cuál?">
          <input
            value={form.alergico_anestesico_cual ?? ""}
            onChange={(e) => set("alergico_anestesico_cual", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
        <Campo label="¿Ha sido intervenido quirúrgicamente?">
          <SiNo valor={form.cirugia_previa} onChange={(v) => set("cirugia_previa", v)} />
        </Campo>
        <Campo label="¿De qué?">
          <input
            value={form.cirugia_previa_cual ?? ""}
            onChange={(e) => set("cirugia_previa_cual", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
        <Campo label="¿Presenta problemas de sangrado o cicatrización?">
          <SiNo valor={form.problemas_sangrado} onChange={(v) => set("problemas_sangrado", v)} />
        </Campo>
        <Campo label="¿Está embarazada?">
          <SiNo valor={form.embarazada} onChange={(v) => set("embarazada", v)} />
        </Campo>
        <Campo label="¿Está en periodo de lactancia?">
          <SiNo valor={form.lactancia} onChange={(v) => set("lactancia", v)} />
        </Campo>
      </Seccion>

      <Seccion titulo="Antecedentes personales no patológicos">
        <Campo label="¿Consume alcohol?">
          <SiNo valor={form.consume_alcohol} onChange={(v) => set("consume_alcohol", v)} />
        </Campo>
        <Campo label="¿Consume tabaco?">
          <SiNo valor={form.consume_tabaco} onChange={(v) => set("consume_tabaco", v)} />
        </Campo>
        <Campo label="¿Enfermedades de transmisión sexual (VIH/VPH)?">
          <SiNo valor={form.ets} onChange={(v) => set("ets", v)} />
        </Campo>
        <Campo label="¿Cuál?">
          <input
            value={form.ets_cual ?? ""}
            onChange={(e) => set("ets_cual", e.target.value || null)}
            className={inputClase}
          />
        </Campo>
      </Seccion>

      <button
        onClick={guardar}
        disabled={guardando}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3 text-[14px] font-semibold text-white disabled:opacity-50"
      >
        <Save size={15} /> {guardando ? "Guardando…" : guardado ? "Guardado ✓" : "Guardar historia clínica"}
      </button>
    </div>
  );
}
