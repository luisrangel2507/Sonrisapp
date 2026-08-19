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

const MOUTH_IMG = "/odontograma-boca.jpg";

function anguloYPosicion(angulo: number, radio: number, cx: number, cy: number) {
  const rad = (angulo * Math.PI) / 180;
  return { x: cx + radio * Math.sin(rad), y: cy - radio * Math.cos(rad) };
}

const nodos = [
  ...ARCO_SUPERIOR.map((n, i) => ({ n, angulo: -95 + i * (190 / 15) })),
  ...ARCO_INFERIOR.map((n, i) => ({ n, angulo: 95 + i * (170 / 15) })),
];

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
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

  const cx = 170, cy = 170, rInner = 100, rBadge = 150;

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

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-[28px] border border-white/10 p-5"
        style={{ background: "radial-gradient(circle at 50% 35%, #241a38 0%, #120d1c 65%, #0a0714 100%)" }}
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

        <div className="relative mt-4 flex justify-center">
          <div className="relative" style={{ width: "100%", maxWidth: 320, aspectRatio: "1/1" }}>
            <img
              src={MOUTH_IMG}
              alt="Odontograma"
              className="absolute rounded-full object-cover"
              style={{
                left: "17.6%", top: "17.6%", width: "64.8%", height: "64.8%",
                boxShadow: "0 0 40px rgba(124,92,224,0.45)",
              }}
            />
            <svg width="100%" height="100%" viewBox="0 0 340 340" className="absolute inset-0">
              <defs>
                <radialGradient id="scanGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#7C5CE0" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#7C5CE0" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx={cx} cy={cy} r={rInner + 45} fill="url(#scanGlow)" />
              <circle cx={cx} cy={cy} r={rInner + 10} fill="none" stroke="#7C5CE0" strokeOpacity="0.3" strokeWidth="1" />

              {nodos.map(({ n, angulo }) => {
                const outer = anguloYPosicion(angulo, rBadge, cx, cy);
                const inner = anguloYPosicion(angulo, rInner - 4, cx, cy);
                const est = ESTADO_DIENTE[historial[n]?.estado ?? "sano"];
                const activo = n === seleccionado;
                return (
                  <line
                    key={n}
                    x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                    stroke={activo ? est.ring : "#ffffff"}
                    strokeOpacity={activo ? 0.6 : 0.12}
                    strokeWidth={activo ? 1.5 : 1}
                  />
                );
              })}
              {nodos.map(({ n, angulo }) => {
                const pos = anguloYPosicion(angulo, rBadge, cx, cy);
                const est = ESTADO_DIENTE[historial[n]?.estado ?? "sano"];
                const activo = n === seleccionado;
                return (
                  <g
                    key={n}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => {
                      setSeleccionado(n);
                      setFormAbierto(false);
                    }}
                    className="cursor-pointer"
                    style={{ transition: "transform 0.15s" }}
                  >
                    {activo && <circle r="16" fill={`rgba(${est.glow},0.3)`} />}
                    <circle
                      r={activo ? 13 : 11}
                      fill={activo ? `rgba(${est.glow},0.25)` : "#171129"}
                      stroke={est.ring}
                      strokeWidth={activo ? 2 : 1.2}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="mt-3 flex justify-center gap-2">
          {[
            { id: "frontal", label: "Frontal" },
            { id: "superior", label: "Superior" },
            { id: "inferior", label: "Inferior" },
            { id: "lateral", label: "Lateral" },
          ].map((v) => (
            <button
              key={v.id}
              disabled={v.id !== "frontal"}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${
                v.id === "frontal"
                  ? "border-[#7C5CE0]/50 bg-[#7C5CE0]/15 text-white"
                  : "border-white/10 text-white/25"
              }`}
            >
              {v.label}{v.id !== "frontal" && " · próx."}
            </button>
          ))}
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
