"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  ARCO_SUPERIOR,
  ARCO_INFERIOR,
  ESTADO_DIENTE,
  FDI_A_UNIVERSAL,
  type EstadoDiente,
  type HistorialDental,
} from "@/lib/dental";
import type { Paciente } from "@/lib/types";
import { fechaSoloDia } from "@/lib/fechas";

// Arco inferior en orden de despliegue (espejo del arco superior para
// que cada diente quede alineado en vertical con su pareja de arriba).
const ARCO_INFERIOR_VISUAL = [...ARCO_INFERIOR].reverse();

function formatearFecha(fecha: string) {
  return fechaSoloDia(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function DienteIcono({ arriba }: { arriba: boolean }) {
  return (
    <svg viewBox="0 0 24 34" width="100%" height="100%" style={arriba ? undefined : { transform: "scaleY(-1)" }}>
      <path
        d="M12 2C7.5 2 3 4.7 3 10c0 4.6 1.7 8.2 2.8 13 .4 2 1.3 4.7 3 4.7 1.4 0 1.9-2 2.3-3.9.3-1.3.6-2.3 1-2.3s.6 1 1 2.3c.4 1.9 1 3.9 2.3 3.9 1.7 0 2.6-2.7 3-4.7C19.3 18.2 21 14.6 21 10c0-5.3-4.5-8-9-8z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Diente({
  numero,
  arriba,
  estado,
  activo,
  onClick,
}: {
  numero: number;
  arriba: boolean;
  estado: EstadoDiente;
  activo: boolean;
  onClick: () => void;
}) {
  const est = ESTADO_DIENTE[estado];
  return (
    <button
      onClick={onClick}
      className="shrink-0"
      style={{ width: 19, height: 30 }}
      aria-label={`Diente ${numero}`}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          color: est.ring,
          fill: activo ? `rgba(${est.glow},0.55)` : `rgba(${est.glow},0.16)`,
          stroke: est.ring,
          strokeWidth: activo ? 1.8 : 1,
          filter: activo ? `drop-shadow(0 0 5px rgba(${est.glow},0.7))` : undefined,
          transition: "filter 0.15s",
        }}
      >
        <DienteIcono arriba={arriba} />
      </div>
    </button>
  );
}

export function Odontograma({ paciente }: { paciente: Paciente }) {
  const [seleccionado, setSeleccionado] = useState<number>(16);
  const [numeracion, setNumeracion] = useState<"fdi" | "universal">("fdi");
  const [historial, setHistorial] = useState<HistorialDental>({});
  const [cargando, setCargando] = useState(true);
  const [formAbierto, setFormAbierto] = useState(false);
  const [tipo, setTipo] = useState("");
  const [nota, setNota] = useState("");
  const [estadoNuevo, setEstadoNuevo] = useState<EstadoDiente | "">("");
  const [guardando, setGuardando] = useState(false);

  async function cargarHistorial() {
    setCargando(true);
    const res = await fetch(`/api/pacientes/${paciente.id}/dientes`);
    const data = await res.json();
    setHistorial(data.historial ?? {});
    setCargando(false);
  }

  useEffect(() => {
    cargarHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciente.id]);

  const info = historial[seleccionado];
  const estado = ESTADO_DIENTE[info?.estado ?? "sano"];
  const mostrarNumero = (n: number) => (numeracion === "fdi" ? n : FDI_A_UNIVERSAL[n]);

  async function agregarRegistro() {
    if (!tipo.trim() || guardando) return;
    setGuardando(true);
    await fetch(`/api/pacientes/${paciente.id}/dientes/${seleccionado}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, nota: nota || null, estado: estadoNuevo || undefined }),
    });
    setTipo("");
    setNota("");
    setEstadoNuevo("");
    setFormAbierto(false);
    setGuardando(false);
    await cargarHistorial();
  }

  function seleccionar(n: number) {
    setSeleccionado(n);
    setFormAbierto(false);
  }

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-[28px] border border-white/10 p-5"
        style={{ background: "radial-gradient(circle at 50% 0%, #241a38 0%, #120d1c 65%, #0a0714 100%)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Odontograma clínico</div>
            <div className="text-[13px] text-white/70">
              {paciente.nombre} {paciente.folio ? `· ficha ${paciente.folio}` : ""}
            </div>
          </div>
          <div className="flex rounded-full border border-white/15 bg-white/5 p-0.5 text-[11px]">
            {(["fdi", "universal"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setNumeracion(s)}
                className={`rounded-full px-3 py-1 font-medium capitalize transition-colors ${
                  numeracion === s ? "bg-[#7C5CE0] text-white" : "text-white/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/odontograma-hud.jpg"
            alt=""
            className="w-full object-cover"
            style={{ aspectRatio: "1300 / 799" }}
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="mx-auto w-max space-y-1">
            <div className="flex items-end justify-center gap-[3px]">
              {ARCO_SUPERIOR.map((n, i) => (
                <div key={n} className="flex items-end" style={i === 8 ? { marginLeft: 8 } : undefined}>
                  <Diente
                    numero={n}
                    arriba={true}
                    estado={historial[n]?.estado ?? "sano"}
                    activo={n === seleccionado}
                    onClick={() => seleccionar(n)}
                  />
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-white/15" />
            <div className="flex items-start justify-center gap-[3px]">
              {ARCO_INFERIOR_VISUAL.map((n, i) => (
                <div key={n} className="flex items-start" style={i === 8 ? { marginLeft: 8 } : undefined}>
                  <Diente
                    numero={n}
                    arriba={false}
                    estado={historial[n]?.estado ?? "sano"}
                    activo={n === seleccionado}
                    onClick={() => seleccionar(n)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-white/10 pt-4">
          {Object.entries(ESTADO_DIENTE).map(([key, v]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: v.ring }} />
              <span className="text-[11px] text-white/50">{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#15101f] p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
              Diente {mostrarNumero(seleccionado)} ({numeracion === "fdi" ? "FDI" : "Universal"})
            </div>
            <div className="mt-0.5 text-sm font-medium" style={{ color: estado.ring }}>
              {estado.label}
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1 text-[11px] font-semibold text-white"
            style={{ backgroundColor: `rgba(${estado.glow},0.25)`, border: `1px solid ${estado.ring}` }}
          >
            {cargando ? "…" : `${info?.entradas.length || 0} registro${info?.entradas.length === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {cargando ? (
            <p className="text-sm text-white/50">Cargando historial…</p>
          ) : info?.entradas?.length ? (
            info.entradas.map((e, i) => (
              <div key={i} className="border-l-2 border-white/10 pl-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/90">{e.tipo}</span>
                  <span className="text-[11px] text-white/40">{formatearFecha(e.fecha)}</span>
                </div>
                {e.nota && <p className="mt-0.5 text-[13px] text-white/50">{e.nota}</p>}
              </div>
            ))
          ) : (
            <p className="text-sm text-white/50">Sin historial registrado — diente sano.</p>
          )}
        </div>

        {formAbierto ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <input
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="Tipo de tratamiento (ej. Resina)"
              className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
            />
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nota (opcional)"
              rows={2}
              className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
            />
            <select
              value={estadoNuevo}
              onChange={(e) => setEstadoNuevo(e.target.value as EstadoDiente | "")}
              className="w-full rounded-xl border border-white/15 bg-[#15101f] px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">Mantener estado actual</option>
              {Object.entries(ESTADO_DIENTE).map(([key, v]) => (
                <option key={key} value={key}>
                  Cambiar a: {v.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2 pt-1">
              <button
                onClick={agregarRegistro}
                disabled={!tipo.trim() || guardando}
                className="flex-1 rounded-full bg-[#7C5CE0] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
              <button
                onClick={() => setFormAbierto(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-white/70"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setFormAbierto(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 py-2.5 text-[13px] font-semibold text-white/90"
          >
            <Plus size={14} /> Agregar registro a este diente
          </button>
        )}
      </div>
    </div>
  );
}
