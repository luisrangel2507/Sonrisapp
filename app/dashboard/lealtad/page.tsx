"use client";

import { usePacientes, PacienteSelector } from "@/components/PacienteSelector";
import { LoyaltyCard } from "@/components/LoyaltyCard";

export default function LealtadPage() {
  const { pacientes, pacienteId, setPacienteId, cargando, crearPacienteDePrueba } = usePacientes();

  if (cargando) {
    return <p className="mx-4 mt-6 text-sm text-[#8a8272]">Cargando…</p>;
  }

  const paciente = pacientes?.find((p) => p.id === pacienteId);

  return (
    <>
      <PacienteSelector
        pacientes={pacientes ?? []}
        pacienteId={pacienteId}
        setPacienteId={setPacienteId}
        onCrearPrueba={crearPacienteDePrueba}
      />
      {paciente && <LoyaltyCard paciente={paciente} />}
    </>
  );
}
