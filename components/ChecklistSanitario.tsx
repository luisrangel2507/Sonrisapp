"use client";

import { useEffect, useState } from "react";
import { CHECKLIST_SANITARIO } from "@/lib/checklist-sanitario";

interface Estado {
  clave: string;
  cumplido: boolean;
  actualizado_por: string | null;
  actualizado_en: string;
}

// Checklist de requisitos sanitarios del consultorio. Se palomea lo que ya
// se cumple; queda quién lo marcó y cuándo.
export function ChecklistSanitario() {
  const [estado, setEstado] = useState<Record<string, Estado>>({});
  useEffect(() => {
    fetch("/api/checklist-sanitario")
      .then((r) => (r.ok ? r.json() : { estado: [] }))
      .then((d) => setEstado(Object.fromEntries((d.estado as Estado[]).map((e) => [e.clave, e]))))
      .catch(() => {});
  }, []);

  async function alternar(clave: string) {
    const cumplido = !estado[clave]?.cumplido;
    setEstado((e) => ({ ...e, [clave]: { ...(e[clave] ?? { clave, actualizado_por: null, actualizado_en: "" }), cumplido } }));
    await fetch("/api/checklist-sanitario", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave, cumplido }),
    });
  }

  const total = CHECKLIST_SANITARIO.reduce((s, g) => s + g.items.length, 0);
  const hechos = Object.values(estado).filter((e) => e.cumplido).length;

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-4">
        <div className="flex justify-between text-[12px] font-semibold text-[#2b2118]">
          <span>Avance</span>
          <span>
            {hechos} de {total}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EFE9DC]">
          <div className="h-full rounded-full bg-[#3F6B33]" style={{ width: `${(hechos / total) * 100}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-[#a49c8a]">
          Lo que revisa una verificación sanitaria. Si no tienes equipo de rayos X, ignora esa sección.
        </p>
      </div>
      {CHECKLIST_SANITARIO.map((g) => (
        <div key={g.norma} className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#803449]">{g.norma}</div>
          <div className="space-y-1.5">
            {g.items.map(([clave, texto]) => {
              const e = estado[clave];
              return (
                <label key={clave} className="flex items-start gap-2.5 text-[13px] text-[#2b2118]">
                  <input
                    type="checkbox"
                    checked={!!e?.cumplido}
                    onChange={() => alternar(clave)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#3F6B33]"
                  />
                  <span>
                    {texto}
                    {e?.cumplido && e.actualizado_por && (
                      <span className="block text-[10px] text-[#a49c8a]">
                        {e.actualizado_por}
                        {e.actualizado_en ? ` · ${new Date(e.actualizado_en).toLocaleDateString("es-MX")}` : ""}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
