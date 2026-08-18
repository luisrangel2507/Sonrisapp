"use client";

import { usePacientes, PacienteSelector } from "@/components/PacienteSelector";
import { Odontograma } from "@/components/Odontograma";

export default function OdontogramaPage() {
  const { pacientes, pacienteId, setPacienteId, cargando, crearPacienteDePrueba } = usePacientes();

  if (cargando) {
    return <p className="mx-4 mt-6 text-sm text-white/50">Cargando…</p>;
  }

  const paciente = pacientes?.find((p) => p.id === pacienteId);

  return (
    <>
      <PacienteSelector
        pacientes={pacientes ?? []}
        pacienteId={pacienteId}
        setPacienteId={setPacienteId}
        onCrearPrueba={crearPacienteDePrueba}
        dark
      />
      {paciente && <Odontograma paciente={paciente} />}
    </>
  );
}
