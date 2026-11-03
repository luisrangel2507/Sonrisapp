"use client";

import { useState } from "react";
import type { Presupuesto, PresupuestoItem } from "@/lib/types";
import { formatearDinero, importeConcepto } from "@/lib/dinero";

// Conceptos del presupuesto agrupados por etapa. Si el presupuesto está
// aprobado, cada concepto se puede palomear como realizado y se ve el
// avance por etapa y total.
export function PlanFases({ pacienteId, presupuesto }: { pacienteId: number; presupuesto: Presupuesto }) {
  const [items, setItems] = useState<PresupuestoItem[]>(presupuesto.items);
  const [guardando, setGuardando] = useState<number | null>(null);
  const seguimiento = presupuesto.vigente && presupuesto.estado === "aprobado";

  const grupos: { etapa: string; items: PresupuestoItem[] }[] = [];
  for (const it of items) {
    const etapa = it.etapa?.trim() || "";
    let g = grupos.find((x) => x.etapa === etapa);
    if (!g) grupos.push((g = { etapa, items: [] }));
    g.items.push(it);
  }
  const hayEtapas = grupos.some((g) => g.etapa);
  const hechos = items.filter((i) => i.realizado_en).length;

  async function alternar(it: PresupuestoItem) {
    if (guardando) return;
    setGuardando(it.id);
    const res = await fetch(`/api/pacientes/${pacienteId}/presupuestos/${presupuesto.id}/items/${it.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ realizado: !it.realizado_en }),
    });
    if (res.ok) {
      const { item } = await res.json();
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, ...item } : x)));
    }
    setGuardando(null);
  }

  return (
    <div className="mt-2 space-y-2">
      {seguimiento && items.length > 0 && (
        <div>
          <div className="flex justify-between text-[11px] font-semibold text-[#3F6B33]">
            <span>Avance del tratamiento</span>
            <span>
              {hechos} de {items.length}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#EFE9DC]">
            <div className="h-full rounded-full bg-[#3F6B33]" style={{ width: `${(hechos / items.length) * 100}%` }} />
          </div>
        </div>
      )}
      {grupos.map((g, gi) => {
        const hechosG = g.items.filter((i) => i.realizado_en).length;
        return (
          <div key={gi} className="space-y-1">
            {hayEtapas && (
              <div className="flex items-center justify-between pt-1 text-[11px] font-bold uppercase tracking-wide text-[#803449]">
                <span>{g.etapa || "Sin etapa"}</span>
                {seguimiento && (
                  <span className={hechosG === g.items.length ? "text-[#3F6B33]" : "text-[#a49c8a]"}>
                    {hechosG === g.items.length ? "Completada ✓" : `${hechosG}/${g.items.length}`}
                  </span>
                )}
              </div>
            )}
            {g.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-2 text-[12px] text-[#8a8272]">
                <span className="flex min-w-0 items-center gap-2">
                  {seguimiento && (
                    <input
                      type="checkbox"
                      checked={!!it.realizado_en}
                      disabled={guardando === it.id}
                      onChange={() => alternar(it)}
                      aria-label={`Marcar ${it.concepto} como realizado`}
                      className="h-4 w-4 shrink-0 accent-[#3F6B33]"
                    />
                  )}
                  <span className={`truncate ${it.realizado_en ? "text-[#3F6B33] line-through decoration-1" : ""}`}>
                    {it.concepto}
                    {it.cantidad !== 1 && ` ×${it.cantidad}`}
                  </span>
                </span>
                <span className="shrink-0">{formatearDinero(importeConcepto(it))}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
