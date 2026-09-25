"use client";

import { NUMEROS_FDI, POLIGONOS_DIENTE } from "@/lib/dental";

// Mismo criterio del odontograma completo del paciente (foto real +
// polígonos por diente) pero en modo "marcar", sin estado clínico —
// para presupuestos: que el paciente reconozca de un vistazo su propia
// boca en vez de una lista de números. `soloLectura` quita los clics
// para mostrarlo ya armado (link público, lista, PDF).
export function OdontogramaFoto({
  seleccionados,
  onCambiar,
  soloLectura = false,
}: {
  seleccionados: number[];
  onCambiar?: (dientes: number[]) => void;
  soloLectura?: boolean;
}) {
  const set = new Set(seleccionados);
  const todosMarcados = NUMEROS_FDI.every((n) => set.has(n));

  function alternar(n: number) {
    if (soloLectura || !onCambiar) return;
    const nuevo = new Set(set);
    if (nuevo.has(n)) nuevo.delete(n);
    else nuevo.add(n);
    onCambiar([...nuevo].sort((a, b) => a - b));
  }

  function alternarTodos() {
    if (soloLectura || !onCambiar) return;
    onCambiar(todosMarcados ? [] : [...NUMEROS_FDI]);
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl border border-[#EFE9DC]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/odontograma-hud.jpg"
          alt="Odontograma"
          className="block w-full select-none"
          style={{ aspectRatio: "1300 / 799" }}
          draggable={false}
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {NUMEROS_FDI.map((n) => {
            const activo = set.has(n);
            return (
              <polygon
                key={n}
                points={POLIGONOS_DIENTE[n]}
                onClick={() => alternar(n)}
                role={soloLectura ? undefined : "button"}
                aria-label={`Diente ${n}`}
                className={soloLectura ? undefined : "cursor-pointer"}
                style={{
                  fill: activo ? "rgba(128,52,73,0.55)" : "transparent",
                  stroke: activo ? "#803449" : "transparent",
                  strokeWidth: activo ? 0.5 : 0,
                  transition: "fill 0.15s",
                }}
              />
            );
          })}
        </svg>
      </div>
      {!soloLectura && onCambiar && (
        <button
          type="button"
          onClick={alternarTodos}
          className="flex w-full items-center justify-center gap-1 text-[11px] font-medium text-[#803449]"
        >
          {todosMarcados ? "Quitar todos" : "Seleccionar todos"}
        </button>
      )}
      <p className="text-center text-[11px] text-[#a49c8a]">
        {seleccionados.length === 0
          ? soloLectura
            ? "Sin dientes marcados."
            : "Toca los dientes en la foto para marcarlos."
          : `Dientes marcados: ${[...seleccionados].sort((a, b) => a - b).join(", ")}`}
      </p>
    </div>
  );
}
