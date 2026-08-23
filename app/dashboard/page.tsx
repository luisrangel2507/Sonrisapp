"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Calendar, MessageCircle, TrendingUp, Wallet } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { BotChat } from "@/components/BotChat";
import { formatearDinero } from "@/lib/dinero";
import { citaVencidaSinCompletar } from "@/lib/fechas";
import { DOCTORA } from "@/lib/panel-data";
import type { Cita, ResumenDashboard } from "@/lib/types";

function formatearHora(fechaHora: string) {
  return new Date(fechaHora).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
}

const NOMBRE_CORTO_DOCTORA = DOCTORA.nombre.split(" ").slice(0, 2).join(" ");

export default function PanelPage() {
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [citasHoy, setCitasHoy] = useState<Cita[] | null>(null);
  const [citasVencidas, setCitasVencidas] = useState<Cita[]>([]);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);
  const [errorCitas, setErrorCitas] = useState<string | null>(null);
  const [nombreBienvenida, setNombreBienvenida] = useState(NOMBRE_CORTO_DOCTORA);

  useEffect(() => {
    fetch("/api/perfil")
      .then((res) => res.json())
      .then((data) => {
        if (data?.nombre_bienvenida) setNombreBienvenida(data.nombre_bienvenida);
      })
      .catch(() => {});

    fetch("/api/dashboard/resumen")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `error ${res.status}`);
        return res.json();
      })
      .then((data) => setResumen(data.resumen ?? null))
      .catch((err) => setErrorResumen(`No se pudo cargar el resumen: ${err.message}`));

    fetch("/api/citas")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const hoy = new Date().toDateString();
        const citas: Cita[] = data.citas ?? [];
        setCitasHoy(
          citas
            .filter((c) => c.estado !== "cancelada" && new Date(c.fecha_hora).toDateString() === hoy)
            .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
        );
        setCitasVencidas(
          citas.filter(citaVencidaSinCompletar).sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
        );
      })
      .catch((err) => setErrorCitas(`No se pudieron cargar las citas: ${err.message}`));
  }, []);

  return (
    <>
      <div className="flex items-start justify-between border-y border-[#EFE9DC] px-5 py-4">
        <div>
          <h2 className="text-xl font-bold text-[#2b2118]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Bienvenida, {nombreBienvenida}
          </h2>
          <p className="mt-1 text-sm text-[#8a8272]">We&apos;ll be glowing in the dark ✨</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[11px] uppercase tracking-wide text-[#a49c8a]">Citas hoy</div>
          <div className="text-2xl font-bold text-[#3F6B33]">{resumen?.citas_hoy ?? "…"}</div>
        </div>
      </div>

      {citasVencidas.length > 0 && (
        <Link
          href="/dashboard/citas"
          className="mx-4 mt-4 flex items-start gap-2.5 rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>
              {citasVencidas.length} cita{citasVencidas.length === 1 ? "" : "s"} sin marcar como completada
              {citasVencidas.length === 1 ? "" : "s"}
            </strong>{" "}
            — ya pasaron más de 2 horas. Tócalo para revisarlas.
          </span>
        </Link>
      )}

      {(errorResumen || errorCitas) && (
        <div className="mx-4 mt-4 space-y-2">
          {errorResumen && (
            <div className="rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]">
              {errorResumen}
            </div>
          )}
          {errorCitas && (
            <div className="rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]">
              {errorCitas}
            </div>
          )}
        </div>
      )}

      <div className="mt-5">
        <Hero />
      </div>

      <div className="mt-4 flex gap-3 px-4">
        <Pill tone="green" onClick={() => router.push("/dashboard/citas?nuevo=1")}>
          Agendar cita
        </Pill>
        <Pill tone="rose" onClick={() => router.push("/dashboard/pacientes?nuevo=1")}>
          Nuevo paciente
        </Pill>
      </div>

      <div className="mx-4 mt-4 rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">Citas de hoy</div>
        {citasHoy === null ? (
          <p className="mt-2 text-sm text-[#8a8272]">Cargando…</p>
        ) : citasHoy.length === 0 ? (
          <p className="mt-2 text-sm text-[#8a8272]">Sin citas registradas por ahora.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {citasHoy.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[#2b2118]">{c.paciente_nombre}</div>
                  <div className="text-xs text-[#a49c8a]">{c.tratamiento}</div>
                </div>
                <div className="text-sm font-semibold text-[#2b2118]">{formatearHora(c.fecha_hora)}</div>
              </div>
            ))}
          </div>
        )}
        <Link href="/dashboard/citas" className="mt-3 block text-[12px] font-semibold text-[#803449]">
          Ver toda la agenda →
        </Link>
      </div>

      <div className="mx-4 mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Calendar}
          iconBg="bg-[#F7E5E0] text-[#B0503A]"
          label="Citas esta semana"
          value={resumen ? resumen.citas_semana : "…"}
          sub={resumen ? `${resumen.citas_semana_confirmadas} confirmadas` : undefined}
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-[#E8F0E3] text-[#3F6B33]"
          label="Ingresos del mes"
          value={resumen ? formatearDinero(resumen.ingresos_mes) : "…"}
        />
        <StatCard
          icon={Wallet}
          iconBg="bg-[#FCEFD2] text-[#B08419]"
          label="Por cobrar"
          value={resumen ? formatearDinero(resumen.por_cobrar) : "…"}
          sub={resumen && resumen.por_cobrar > 0 ? "pendiente de pago" : undefined}
          subColor="text-[#B0503A]"
        />
        <Link href="/dashboard/citas">
          <StatCard
            icon={MessageCircle}
            iconBg="bg-[#EFE3F0] text-[#7A4D8A]"
            label="Agenda"
            value="Ver todo"
            sub="citas, pagos y cancelaciones"
          />
        </Link>
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
