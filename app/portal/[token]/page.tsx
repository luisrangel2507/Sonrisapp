"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarClock, History } from "lucide-react";
import { DOCTORA } from "@/lib/panel-data";
import { LoyaltyCard } from "@/components/LoyaltyCard";

interface PortalPaciente {
  nombre: string;
  folio: string | null;
  puntos: number;
  meta_premio: number;
  premio_actual: string | null;
  fecha_nacimiento: string | null;
  creado_en: string;
  visitas_totales: number;
}

interface PortalCita {
  tratamiento: string;
  fecha_hora: string;
}

function formatearFechaHora(f: string) {
  return new Date(f).toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatearFecha(f: string) {
  return new Date(f).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export default function PortalPacientePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [paciente, setPaciente] = useState<PortalPaciente | null>(null);
  const [proximaCita, setProximaCita] = useState<PortalCita | null>(null);
  const [historial, setHistorial] = useState<PortalCita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [invalido, setInvalido] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/portal/${token}`);
        const data = await res.json();
        if (!res.ok || !data.paciente) {
          setInvalido(true);
          setCargando(false);
          return;
        }
        setPaciente(data.paciente);
        setProximaCita(data.proxima_cita ?? null);
        setHistorial(data.historial ?? []);
        setCargando(false);
      } catch {
        setInvalido(true);
        setCargando(false);
      }
    })();
  }, [token]);

  if (cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F1EA]">
        <p className="text-sm text-[#8a8272]">Cargando…</p>
      </div>
    );
  }

  if (invalido || !paciente) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F1EA] px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-[#2b2118]">Este link ya no es válido</p>
          <p className="mt-2 text-sm text-[#8a8272]">Pídele a tu clínica que te comparta un link nuevo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F5F1EA]">
      <div className="mx-auto max-w-md space-y-4 px-4 pb-10 pt-6">
        <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-vina-sonrisas.png" alt="Viña Sonrisas" className="mx-auto h-auto w-52" />
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">Tu portal</div>
          <div className="mt-1 text-sm font-medium text-[#2b2118]">Hola, {paciente.nombre.split(" ")[0]} 👋</div>
          <div className="mt-1 text-[11px] text-[#a49c8a]">{DOCTORA.nombre}</div>
        </div>

        <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
            <CalendarClock size={14} /> Próxima cita
          </div>
          {proximaCita ? (
            <div>
              <div className="text-base font-semibold capitalize text-[#2b2118]">
                {formatearFechaHora(proximaCita.fecha_hora)}
              </div>
              <div className="mt-0.5 text-sm text-[#8a8272]">{proximaCita.tratamiento}</div>
            </div>
          ) : (
            <p className="text-sm text-[#a49c8a]">No tienes citas próximas agendadas.</p>
          )}
        </div>

        <LoyaltyCard paciente={paciente} />

        <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
            <History size={14} /> Historial de tratamientos
          </div>
          {historial.length === 0 ? (
            <p className="text-sm text-[#a49c8a]">Todavía no tienes visitas completadas.</p>
          ) : (
            <div className="space-y-3">
              {historial.map((c, i) => (
                <div key={i} className="flex items-center justify-between border-b border-[#EFE9DC] pb-2 last:border-0 last:pb-0">
                  <span className="text-sm font-medium text-[#2b2118]">{c.tratamiento}</span>
                  <span className="text-xs text-[#a49c8a]">{formatearFecha(c.fecha_hora)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
