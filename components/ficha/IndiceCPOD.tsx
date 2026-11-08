"use client";

import { useEffect, useState } from "react";
import { calcularCPOD } from "@/lib/dental";

// Índice CPO-D del paciente (NOM-013), calculado del odontograma.
export function IndiceCPOD({ pacienteId, version }: { pacienteId: number; version: number }) {
  const [r, setR] = useState<ReturnType<typeof calcularCPOD> | null>(null);
  useEffect(() => {
    fetch(`/api/pacientes/${pacienteId}/dientes`)
      .then((x) => (x.ok ? x.json() : null))
      .then((d) => {
        const hist = (d?.historial ?? {}) as Record<number, { estado: string }>;
        const estados: Record<number, string> = {};
        for (const [n, v] of Object.entries(hist)) estados[Number(n)] = v.estado;
        setR(calcularCPOD(estados));
      })
      .catch(() => {});
  }, [pacienteId, version]);
  if (!r) return null;
  const caja = "flex-1 rounded-2xl bg-[#FBF9F5] px-2 py-2 text-center";
  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#8a8272]">Índice CPO-D</div>
        <div className="text-[12px] text-[#8a8272]">
          Total <b className="text-[#2b2118]">{r.total}</b> · {r.nivel}
        </div>
      </div>
      <div className="flex gap-2">
        <div className={caja}>
          <div className="text-lg font-bold text-[#C81E3A]">{r.c}</div>
          <div className="text-[10px] text-[#8a8272]">Cariados</div>
        </div>
        <div className={caja}>
          <div className="text-lg font-bold text-[#6B6575]">{r.p}</div>
          <div className="text-[10px] text-[#8a8272]">Perdidos</div>
        </div>
        <div className={caja}>
          <div className="text-lg font-bold text-[#3E6FD9]">{r.o}</div>
          <div className="text-[10px] text-[#8a8272]">Obturados</div>
        </div>
      </div>
    </div>
  );
}
