"use client";

import { Fragment } from "react";
import { ARCO_SUPERIOR, ARCO_INFERIOR } from "@/lib/dental";

// Arco inferior en orden de despliegue (espejo del arco superior para
// que cada diente quede alineado en vertical con su pareja de arriba) —
// mismo criterio que el odontograma completo del paciente.
const ARCO_INFERIOR_VISUAL = [...ARCO_INFERIOR].reverse();

function Fila({
  numeros,
  seleccionados,
  soloLectura,
  onAlternar,
}: {
  numeros: number[];
  seleccionados: Set<number>;
  soloLectura: boolean;
  onAlternar: (n: number) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {numeros.map((n, i) => (
        <Fragment key={n}>
          {i === 8 && <div className="mx-1 w-px self-stretch bg-[#EFE9DC]" />}
          <button
            type="button"
            disabled={soloLectura}
            onClick={() => onAlternar(n)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors ${
              seleccionados.has(n)
                ? "border-[#803449] bg-[#803449] text-white"
                : "border-[#EFE9DC] bg-white text-[#8a8272]"
            } ${soloLectura ? "" : "cursor-pointer"}`}
          >
            {n}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

// Mini odontograma seleccionable — no lleva estado clínico (eso vive en
// el odontograma completo del paciente), solo marca qué dientes están
// involucrados en algo puntual como un presupuesto. `soloLectura`
// quita los clics para mostrarlo ya armado (link público, PDF/lista).
export function SelectorDientes({
  seleccionados,
  onCambiar,
  soloLectura = false,
}: {
  seleccionados: number[];
  onCambiar?: (dientes: number[]) => void;
  soloLectura?: boolean;
}) {
  const set = new Set(seleccionados);

  function alternar(n: number) {
    if (!onCambiar) return;
    const nuevo = new Set(set);
    if (nuevo.has(n)) nuevo.delete(n);
    else nuevo.add(n);
    onCambiar([...nuevo].sort((a, b) => a - b));
  }

  return (
    <div className="space-y-1.5 rounded-2xl border border-[#EFE9DC] bg-[#FBF9F5] p-3">
      <Fila numeros={ARCO_SUPERIOR} seleccionados={set} soloLectura={soloLectura} onAlternar={alternar} />
      <div className="border-t border-dashed border-[#EFE9DC]" />
      <Fila numeros={ARCO_INFERIOR_VISUAL} seleccionados={set} soloLectura={soloLectura} onAlternar={alternar} />
    </div>
  );
}
