"use client";

import { useState } from "react";
import { CreditCard, Gift, Cake, Plus } from "lucide-react";
import type { Paciente } from "@/lib/types";
import { proximoCumpleanos } from "@/lib/fechas";

type PacienteLealtad = Pick<
  Paciente,
  "nombre" | "puntos" | "meta_premio" | "premio_actual" | "fecha_nacimiento" | "creado_en" | "folio" | "visitas_totales"
>;

export function LoyaltyCard({
  paciente,
  onRegistrarReferido,
}: {
  paciente: PacienteLealtad;
  // Solo se pasa desde la ficha del paciente en el dashboard — en el
  // portal público del paciente (/portal/[token]) se omite a propósito,
  // para que nadie con el link pueda sumarse puntos solo.
  onRegistrarReferido?: (puntos: number) => Promise<void>;
}) {
  const [formAbierto, setFormAbierto] = useState(false);
  const [puntosReferido, setPuntosReferido] = useState("20");
  const [guardando, setGuardando] = useState(false);

  async function registrar() {
    const puntos = Number(puntosReferido);
    if (!Number.isFinite(puntos) || puntos <= 0 || guardando || !onRegistrarReferido) return;
    setGuardando(true);
    try {
      await onRegistrarReferido(puntos);
      setFormAbierto(false);
      setPuntosReferido("20");
    } finally {
      setGuardando(false);
    }
  }

  const progreso = Math.min(100, Math.round((paciente.puntos / (paciente.meta_premio || 1)) * 100));
  const cumple = proximoCumpleanos(paciente.fecha_nacimiento);
  const desde = new Date(paciente.creado_en).toLocaleDateString("es-MX", { month: "short", year: "numeric" });

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-[26px] p-6 text-white"
        style={{ background: "linear-gradient(135deg, #2b2118 0%, #4a3a2a 55%, #803449 130%)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-white/60">Tarjeta de lealtad</div>
            <div className="mt-1 text-lg font-semibold" style={{ fontFamily: "Georgia, serif" }}>
              {paciente.nombre}
            </div>
          </div>
          <CreditCard size={22} className="text-white/50" />
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-white/50">Puntos</div>
            <div className="text-3xl font-bold">{paciente.puntos}</div>
          </div>
          <div className="text-right text-[11px] text-white/60">
            Folio {paciente.folio}
            <br />
            Miembro desde {desde}
          </div>
        </div>

        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-[#F0D89A]" style={{ width: `${progreso}%` }} />
          </div>
          <div className="mt-1.5 text-[11px] text-white/60">
            {Math.max(0, paciente.meta_premio - paciente.puntos)} pts para: {paciente.premio_actual}
          </div>
        </div>

        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {cumple?.proximo && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#F0D89A] bg-[#FCEFD2] px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#B08419]">
            <Cake size={15} />
          </div>
          <p className="text-[13px] text-[#7a5c14]">
            Cumple años el <strong>{cumple.fechaTexto}</strong> — el bot le manda una felicitación automática ese día.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">Cómo funciona</div>
        <ul className="space-y-2 text-[13px] text-[#8a8272]">
          <li className="flex gap-2"><Gift size={14} className="mt-0.5 shrink-0 text-[#803449]" /> Se genera sola al dar de alta al paciente.</li>
          <li className="flex gap-2"><Gift size={14} className="mt-0.5 shrink-0 text-[#803449]" /> Gana puntos cada vez que refiere a alguien nuevo.</li>
          <li className="flex gap-2"><Gift size={14} className="mt-0.5 shrink-0 text-[#803449]" /> Al llegar a la meta, el bot le avisa por WhatsApp.</li>
        </ul>
        <div className="mt-4 text-[11px] text-[#a49c8a]">{paciente.visitas_totales} visitas registradas en total.</div>

        {onRegistrarReferido &&
          (formAbierto ? (
            <div className="mt-4 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
              <label className="block text-[11px] font-medium text-[#a49c8a]">Puntos a sumar</label>
              <input
                type="number"
                min="1"
                value={puntosReferido}
                onChange={(e) => setPuntosReferido(e.target.value)}
                className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
              />
              <div className="flex gap-2">
                <button
                  onClick={registrar}
                  disabled={!Number(puntosReferido) || guardando}
                  className="flex-1 rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  {guardando ? "Guardando…" : "Sumar puntos"}
                </button>
                <button
                  onClick={() => setFormAbierto(false)}
                  className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setFormAbierto(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#E3C3C9] bg-[#F5E7E9] py-2.5 text-[13px] font-semibold text-[#803449]"
            >
              <Plus size={14} /> Registrar referido
            </button>
          ))}
      </div>
    </div>
  );
}
