"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserCheck, AlertTriangle } from "lucide-react";

export interface ParecidoPaciente {
  id: number;
  nombre: string;
  folio: string | null;
  telefono: string | null;
  activo: boolean;
  motivo: "mismo_telefono" | "mismo_nombre" | "nombre_parecido";
}

const MOTIVO: Record<ParecidoPaciente["motivo"], string> = {
  mismo_telefono: "Mismo teléfono",
  mismo_nombre: "Mismo nombre",
  nombre_parecido: "Nombre parecido",
};

// Mientras se escribe el nombre o el teléfono, busca si ya hay un paciente
// igual o parecido (con una pausa para no consultar en cada tecla).
export function useParecidos(nombre: string, telefono = "") {
  const [parecidos, setParecidos] = useState<ParecidoPaciente[]>([]);
  useEffect(() => {
    const n = nombre.trim();
    if (n.length < 3 && telefono.replace(/\D/g, "").length < 10) {
      setParecidos([]);
      return;
    }
    let vigente = true;
    const t = setTimeout(() => {
      fetch(`/api/pacientes/duplicados?nombre=${encodeURIComponent(n)}&telefono=${encodeURIComponent(telefono)}`)
        .then((r) => (r.ok ? r.json() : { parecidos: [] }))
        .then((d) => vigente && setParecidos(d.parecidos ?? []))
        .catch(() => {});
    }, 350);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [nombre, telefono]);
  return parecidos;
}

// Aviso "ya está registrado": lista a los pacientes parecidos y pide
// decidir antes de crear otro.
export function ParecidosPaciente({
  parecidos,
  confirmado,
  onConfirmar,
  onUsar,
}: {
  parecidos: ParecidoPaciente[];
  confirmado: boolean;
  onConfirmar: () => void;
  // Si se da, aparece "Usar este paciente" (en Agenda: agendar a quien ya existe).
  onUsar?: (p: ParecidoPaciente) => void;
}) {
  if (parecidos.length === 0) return null;
  return (
    <div className="space-y-2 rounded-2xl border border-[#E8D8A0] bg-[#FCF3DC] p-3">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#8A6412]">
        <AlertTriangle size={14} />
        {parecidos.length === 1 ? "Ya hay un paciente parecido" : "Ya hay pacientes parecidos"}
      </div>
      <div className="space-y-1.5">
        {parecidos.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[#2b2118]">
                {p.nombre}
                {!p.activo && <span className="ml-1.5 text-[11px] font-normal text-[#a49c8a]">(de baja)</span>}
              </div>
              <div className="text-[11px] text-[#8a8272]">
                {[p.folio, p.telefono, MOTIVO[p.motivo]].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {onUsar && (
                <button
                  type="button"
                  onClick={() => onUsar(p)}
                  className="flex items-center gap-1 rounded-full bg-[#7A1E33] px-2.5 py-1 text-[11px] font-semibold text-white"
                >
                  <UserCheck size={12} /> Usar
                </button>
              )}
              <Link
                href={`/dashboard/pacientes/${p.id}`}
                className="rounded-full border border-[#EFE9DC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#7A1E33]"
              >
                Abrir ficha
              </Link>
            </div>
          </div>
        ))}
      </div>
      {confirmado ? (
        <p className="text-[12px] font-medium text-[#3F6B33]">Entendido: se creará como un paciente nuevo.</p>
      ) : (
        <button
          type="button"
          onClick={onConfirmar}
          className="w-full rounded-full border border-[#E8D8A0] bg-white py-2 text-[12px] font-semibold text-[#8A6412]"
        >
          Es otra persona, crear de todos modos
        </button>
      )}
    </div>
  );
}
