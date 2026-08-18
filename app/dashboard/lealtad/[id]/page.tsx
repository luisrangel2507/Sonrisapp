"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import type { Paciente } from "@/lib/types";

export default function LealtadDetallePage() {
  const params = useParams<{ id: string }>();
  const pacienteId = Number(params.id);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!Number.isInteger(pacienteId)) return;
    fetch(`/api/pacientes/${pacienteId}`)
      .then((res) => res.json())
      .then((data) => {
        setPaciente(data.paciente ?? null);
        setCargando(false);
      });
  }, [pacienteId]);

  return (
    <>
      <div className="mx-4 mt-2">
        <Link href="/dashboard/lealtad" className="inline-flex items-center gap-1 text-sm text-[#8a8272]">
          <ChevronLeft size={15} /> Lealtad
        </Link>
      </div>
      {cargando ? (
        <p className="mx-4 mt-6 text-sm text-[#8a8272]">Cargando…</p>
      ) : paciente ? (
        <LoyaltyCard paciente={paciente} />
      ) : (
        <p className="mx-4 mt-6 text-sm text-[#8a8272]">Paciente no encontrado.</p>
      )}
    </>
  );
}
