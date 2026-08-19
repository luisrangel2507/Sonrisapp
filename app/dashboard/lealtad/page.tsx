"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cake, ChevronRight } from "lucide-react";
import type { Paciente } from "@/lib/types";
import { proximoCumpleanos } from "@/lib/fechas";

export default function LealtadListaPage() {
  const [pacientes, setPacientes] = useState<Paciente[] | null>(null);

  useEffect(() => {
    fetch("/api/pacientes")
      .then((res) => res.json())
      .then((data) => setPacientes(data.pacientes ?? []));
  }, []);

  if (pacientes === null) {
    return <p className="mx-4 mt-6 text-sm text-[#8a8272]">Cargando…</p>;
  }

  if (pacientes.length === 0) {
    return (
      <p className="mx-4 mt-2 rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-sm text-[#8a8272]">
        Aún no hay pacientes registrados.{" "}
        <Link href="/dashboard/pacientes" className="font-semibold text-[#C96F3B] underline">
          Da de alta al primero
        </Link>
        .
      </p>
    );
  }

  const ordenados = [...pacientes].sort((a, b) => b.puntos - a.puntos);

  return (
    <div className="mx-4 mt-2 space-y-2 pb-6 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
      {ordenados.map((p) => {
        const progreso = Math.min(100, Math.round((p.puntos / (p.meta_premio || 1)) * 100));
        const cumple = proximoCumpleanos(p.fecha_nacimiento);
        return (
          <Link
            key={p.id}
            href={`/dashboard/lealtad/${p.id}`}
            className="block rounded-2xl border border-[#EFE9DC] bg-white/70 px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-[#2b2118]">
                  {p.nombre}
                  {cumple?.proximo && <Cake size={13} className="text-[#B08419]" />}
                </div>
                <div className="text-xs text-[#a49c8a]">{p.folio}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#C96F3B]">{p.puntos} pts</span>
                <ChevronRight size={16} className="text-[#a49c8a]" />
              </div>
            </div>
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFE9DC]">
                <div className="h-full rounded-full bg-[#C96F3B]" style={{ width: `${progreso}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-[#a49c8a]">
                {Math.max(0, p.meta_premio - p.puntos)} pts para: {p.premio_actual}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
