"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Paciente } from "@/lib/types";

// Mantiene la selección de paciente sincronizada con ?paciente=<id> en la
// URL, así el expediente puede enlazar directo a "Ver odontograma"/"Ver
// tarjeta" de un paciente específico.
export function usePacientes() {
  const router = useRouter();
  const pathname = usePathname();
  const [pacientes, setPacientes] = useState<Paciente[] | null>(null);
  const [pacienteId, setPacienteIdState] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);

  const setPacienteId = useCallback(
    (id: number) => {
      setPacienteIdState(id);
      const params = new URLSearchParams(window.location.search);
      params.set("paciente", String(id));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname]
  );

  async function recargar() {
    setCargando(true);
    const res = await fetch("/api/pacientes");
    const data = await res.json();
    const lista: Paciente[] = data.pacientes ?? [];
    setPacientes(lista);
    setPacienteIdState((actual) => {
      if (actual && lista.some((p) => p.id === actual)) return actual;
      const desdeUrl = Number(new URLSearchParams(window.location.search).get("paciente"));
      if (lista.some((p) => p.id === desdeUrl)) return desdeUrl;
      return lista[0]?.id ?? null;
    });
    setCargando(false);
  }

  useEffect(() => {
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function crearPacienteDePrueba() {
    const res = await fetch("/api/pacientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: "Fer Osorio",
        telefono: "4425017739",
        fecha_nacimiento: "1994-08-18",
      }),
    });
    const data = await res.json();
    await recargar();
    if (data.paciente?.id) setPacienteId(data.paciente.id);
  }

  return { pacientes, pacienteId, setPacienteId, cargando, crearPacienteDePrueba, recargar };
}

export function PacienteSelector({
  pacientes,
  pacienteId,
  setPacienteId,
  onCrearPrueba,
  dark = false,
}: {
  pacientes: Paciente[];
  pacienteId: number | null;
  setPacienteId: (id: number) => void;
  onCrearPrueba: () => void;
  dark?: boolean;
}) {
  if (pacientes.length === 0) {
    return (
      <div className={`mx-4 mt-2 rounded-2xl border p-4 text-sm ${dark ? "border-white/10 bg-white/5 text-white/70" : "border-[#EFE9DC] bg-white/70 text-[#8a8272]"}`}>
        Aún no hay pacientes registrados.{" "}
        <button onClick={onCrearPrueba} className={`font-semibold underline ${dark ? "text-[#7C5CE0]" : "text-[#C96F3B]"}`}>
          Crear paciente de prueba
        </button>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-2">
      <select
        value={pacienteId ?? ""}
        onChange={(e) => setPacienteId(Number(e.target.value))}
        className={`w-full rounded-full border px-4 py-2 text-sm font-medium ${
          dark ? "border-white/15 bg-white/5 text-white" : "border-[#EFE9DC] bg-white text-[#2b2118]"
        }`}
      >
        {pacientes.map((p) => (
          <option key={p.id} value={p.id} className="text-black">
            {p.nombre} {p.folio ? `· ${p.folio}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
