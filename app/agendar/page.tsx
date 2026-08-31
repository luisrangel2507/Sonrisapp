"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock } from "lucide-react";
import { TRATAMIENTOS } from "@/lib/panel-data";
import { horariosDelDia } from "@/lib/horarios-publicos";

const OPCIONES_CONSULTA = ["Valoración inicial", ...TRATAMIENTOS];
const DIAS_A_MOSTRAR = 14;

interface Slot {
  hora: string;
  iso: string;
}

function slotsDelDia(dia: Date): Slot[] {
  return horariosDelDia(dia.getDay()).map((hora) => {
    const [h, m] = hora.split(":").map(Number);
    const dt = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m, 0, 0);
    return { hora, iso: dt.toISOString() };
  });
}

export default function AgendarPage() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tratamiento, setTratamiento] = useState(OPCIONES_CONSULTA[0]);

  const dias = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Array.from({ length: DIAS_A_MOSTRAR }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i));
  }, []);

  const [diaSeleccionado, setDiaSeleccionado] = useState<Date>(dias[0]);
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [slotSeleccionado, setSlotSeleccionado] = useState<Slot | null>(null);

  const slots = useMemo(() => slotsDelDia(diaSeleccionado), [diaSeleccionado]);

  useEffect(() => {
    setSlotSeleccionado(null);
    if (slots.length === 0) {
      setOcupados(new Set());
      return;
    }
    setCargandoHorarios(true);
    const isos = slots.map((s) => s.iso).join(",");
    fetch(`/api/agendar/horarios?slots=${encodeURIComponent(isos)}`)
      .then((res) => res.json())
      .then((data) => setOcupados(new Set<string>(data.ocupados ?? [])))
      .finally(() => setCargandoHorarios(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaSeleccionado]);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  async function agendar() {
    if (!nombre.trim() || !telefono.trim() || !slotSeleccionado || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          tratamiento,
          fecha_hora: slotSeleccionado.iso,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo agendar tu cita.");
      setListo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agendar tu cita.");
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F1EA] px-6 text-center">
        <div className="max-w-sm">
          <CheckCircle2 size={40} className="mx-auto text-[#3F6B33]" />
          <p className="mt-4 text-lg font-semibold text-[#2b2118]">¡Listo, {nombre.split(" ")[0]}!</p>
          <p className="mt-2 text-sm text-[#8a8272]">
            Tu cita quedó apartada para el{" "}
            {slotSeleccionado &&
              new Date(slotSeleccionado.iso).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}{" "}
            a las {slotSeleccionado?.hora}. Nuestro equipo la va a confirmar y te contactamos por WhatsApp o
            llamada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F5F1EA]">
      <div className="mx-auto max-w-md space-y-4 px-4 pb-10 pt-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-vina-sonrisas.png" alt="Viña Sonrisas" className="mx-auto h-auto w-44" />

        <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-center">
          <h1 className="text-lg font-bold text-[#2b2118]" style={{ fontFamily: "Georgia, serif" }}>
            Agenda tu valoración
          </h1>
          <p className="mt-1 text-[13px] text-[#8a8272]">
            Tu sonrisa es tu mejor carta de presentación — elige tus datos y el horario que más te acomode.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo *"
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3.5 py-2.5 text-sm text-[#2b2118] outline-none focus:border-[#803449]"
          />
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            type="tel"
            placeholder="Teléfono (WhatsApp) *"
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3.5 py-2.5 text-sm text-[#2b2118] outline-none focus:border-[#803449]"
          />
          <select
            value={tratamiento}
            onChange={(e) => setTratamiento(e.target.value)}
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3.5 py-2.5 text-sm text-[#2b2118] outline-none focus:border-[#803449]"
          >
            {OPCIONES_CONSULTA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
          <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
            <CalendarDays size={13} /> Elige el día
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dias.map((d) => {
              const activo = d.getTime() === diaSeleccionado.getTime();
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setDiaSeleccionado(d)}
                  className={`flex shrink-0 flex-col items-center rounded-2xl border px-3 py-2 text-center ${
                    activo ? "border-[#803449] bg-[#F5E7E9]" : "border-[#EFE9DC] bg-white"
                  }`}
                >
                  <span className={`text-[10px] uppercase ${activo ? "text-[#803449]" : "text-[#a49c8a]"}`}>
                    {d.toLocaleDateString("es-MX", { weekday: "short" })}
                  </span>
                  <span className={`text-sm font-semibold ${activo ? "text-[#803449]" : "text-[#2b2118]"}`}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-3 mt-5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
            <Clock size={13} /> Elige la hora
          </div>
          {slots.length === 0 ? (
            <p className="text-sm text-[#a49c8a]">Ese día el consultorio no abre.</p>
          ) : cargandoHorarios ? (
            <p className="text-sm text-[#a49c8a]">Cargando horarios…</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((s) => {
                const ocupado = ocupados.has(s.iso);
                const activo = slotSeleccionado?.iso === s.iso;
                return (
                  <button
                    key={s.iso}
                    disabled={ocupado}
                    onClick={() => setSlotSeleccionado(s)}
                    className={`rounded-xl border py-2 text-[12px] font-medium ${
                      ocupado
                        ? "cursor-not-allowed border-[#EFE9DC] bg-[#F5F1EA] text-[#c9c2b3] line-through"
                        : activo
                          ? "border-[#803449] bg-[#803449] text-white"
                          : "border-[#EFE9DC] bg-white text-[#2b2118]"
                    }`}
                  >
                    {s.hora}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="px-1 text-[12px] font-medium text-[#B0503A]">{error}</p>}

        <button
          onClick={agendar}
          disabled={!nombre.trim() || !telefono.trim() || !slotSeleccionado || enviando}
          className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #B2485F 0%, #803449 130%)" }}
        >
          {enviando ? "Agendando…" : "Agendar cita"}
        </button>
      </div>
    </div>
  );
}
