"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save } from "lucide-react";
import type { Paciente } from "@/lib/types";
import { DOCTORA } from "@/lib/panel-data";
import {
  CamposHistoriaClinica,
  HISTORIA_CLINICA_VACIA,
  type FormStateHistoriaClinica,
} from "@/components/HistoriaClinicaFormulario";

export default function HistoriaClinicaPage() {
  const params = useParams<{ id: string }>();
  const pacienteId = Number(params.id);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [form, setForm] = useState<FormStateHistoriaClinica>(HISTORIA_CLINICA_VACIA);
  const [alergias, setAlergias] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [antecedentes, setAntecedentes] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  function set<K extends keyof FormStateHistoriaClinica>(campo: K, valor: FormStateHistoriaClinica[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  useEffect(() => {
    if (!Number.isInteger(pacienteId)) return;
    Promise.all([
      fetch(`/api/pacientes/${pacienteId}`).then((r) => r.json()),
      fetch(`/api/pacientes/${pacienteId}/historia-clinica`).then((r) => r.json()),
    ]).then(([dataPaciente, dataHc]) => {
      const p: Paciente | null = dataPaciente.paciente ?? null;
      setPaciente(p);
      setAlergias(p?.alergias ?? "");
      setMedicamentos(p?.medicamentos ?? "");
      setAntecedentes(p?.antecedentes_medicos ?? "");
      if (dataHc.historiaClinica) {
        setForm({ ...HISTORIA_CLINICA_VACIA, ...dataHc.historiaClinica, fecha: dataHc.historiaClinica.fecha.slice(0, 10) });
      }
      setCargando(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  async function guardar() {
    setGuardando(true);
    setGuardado(false);
    await Promise.all([
      fetch(`/api/pacientes/${pacienteId}/historia-clinica`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }),
      fetch(`/api/pacientes/${pacienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alergias: alergias || null,
          medicamentos: medicamentos || null,
          antecedentes_medicos: antecedentes || null,
        }),
      }),
    ]);
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  if (cargando || !paciente) {
    return <p className="mx-4 mt-6 text-sm text-[#8a8272]">Cargando…</p>;
  }

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

      <CamposHistoriaClinica
        form={form}
        set={set}
        pacienteNombre={paciente.nombre}
        pacienteFechaNacimiento={paciente.fecha_nacimiento}
        pacienteTelefono={paciente.telefono}
      />

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#803449]">
          Antecedentes médicos
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[#a49c8a]">Alergias</label>
            <textarea
              value={alergias}
              onChange={(e) => setAlergias(e.target.value)}
              rows={2}
              placeholder="Ej. penicilina, látex…"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm text-[#2b2118] outline-none focus:border-[#803449]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[#a49c8a]">Medicamentos actuales</label>
            <textarea
              value={medicamentos}
              onChange={(e) => setMedicamentos(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm text-[#2b2118] outline-none focus:border-[#803449]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[#a49c8a]">Otros antecedentes</label>
            <textarea
              value={antecedentes}
              onChange={(e) => setAntecedentes(e.target.value)}
              rows={2}
              placeholder="Diabetes, hipertensión, embarazo, etc."
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm text-[#2b2118] outline-none focus:border-[#803449]"
            />
          </div>
        </div>
      </div>

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
