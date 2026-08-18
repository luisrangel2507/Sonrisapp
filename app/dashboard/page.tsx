"use client";

import { useState } from "react";
import { Calendar, MessageCircle, Activity, Users } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { BotChat } from "@/components/BotChat";
import { CITAS_HOY, LEADS_INICIALES } from "@/lib/panel-data";

export default function PanelPage() {
  const [leads] = useState(LEADS_INICIALES);
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      <div className="flex items-start justify-between border-y border-[#EFE9DC] px-5 py-4">
        <div>
          <h2 className="text-xl font-bold text-[#2b2118]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Hola de nuevo, Eduardo
          </h2>
          <p className="mt-1 text-sm text-[#8a8272]">Tu clínica no descansa ni cuando tú duermes.</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[11px] uppercase tracking-wide text-[#a49c8a]">Citas hoy</div>
          <div className="text-2xl font-bold text-[#3F6B33]">{CITAS_HOY.length}</div>
        </div>
      </div>

      <div className="mt-5">
        <Hero />
      </div>

      <div className="mt-4 flex gap-3 px-4">
        <Pill tone="green" onClick={() => setShowChat(true)}>
          Nuevo lead
        </Pill>
        <Pill tone="rose" onClick={() => setShowChat(true)}>
          Agendar cita
        </Pill>
      </div>

      <div className="mx-4 mt-4 rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">Citas de hoy</div>
        {CITAS_HOY.length === 0 ? (
          <p className="mt-2 text-sm text-[#8a8272]">Sin citas registradas por ahora.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {CITAS_HOY.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[#2b2118]">{c.paciente}</div>
                  <div className="text-xs text-[#a49c8a]">{c.tratamiento}</div>
                </div>
                <div className="text-sm font-semibold text-[#2b2118]">{c.hora}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={Users}
          iconBg="bg-[#E8F0E3] text-[#3F6B33]"
          label="Leads activos"
          value={leads.filter((l) => l.estado !== "convertido").length}
          sub="Score promedio 60"
        />
        <StatCard
          icon={Calendar}
          iconBg="bg-[#F7E5E0] text-[#B0503A]"
          label="Citas esta semana"
          value="6"
          sub="4 confirmadas"
        />
        <StatCard
          icon={Activity}
          iconBg="bg-[#EFE3F0] text-[#7A4D8A]"
          label="Convertidos (mes)"
          value="9"
          sub="+3 vs mes pasado"
          subColor="text-[#3F6B33]"
        />
        <StatCard
          icon={MessageCircle}
          iconBg="bg-[#FCEFD2] text-[#B08419]"
          label="Seguimientos"
          value="1"
          sub="Ana T. — vencido"
          subColor="text-[#B0503A]"
        />
      </div>

      <div className="mx-4 mt-4 rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">Pipeline de leads</div>
        <div className="space-y-3">
          {leads.map((l) => (
            <div key={l.id} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#2b2118]">{l.nombre}</div>
                <div className="text-xs text-[#a49c8a]">{l.interes}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[#EFE9DC]">
                  <div className="h-full rounded-full bg-[#C96F3B]" style={{ width: `${l.score}%` }} />
                </div>
                <span className="text-xs text-[#a49c8a]">{l.score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-6">
        {!showChat ? (
          <button
            onClick={() => setShowChat(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#EFE9DC] bg-white py-3.5 text-[15px] font-semibold text-[#2b2118]"
          >
            <MessageCircle size={16} /> Probar el bot de WhatsApp
          </button>
        ) : (
          <div className="h-[440px]">
            <BotChat />
          </div>
        )}
      </div>
    </>
  );
}
