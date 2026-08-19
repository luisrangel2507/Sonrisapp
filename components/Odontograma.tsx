"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Plus } from "lucide-react";
import {
  ARCO_SUPERIOR,
  ARCO_INFERIOR,
  ESTADO_DIENTE,
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

// Recorte del odontograma-hud.jpg (1300×799) donde cae cada arco
// dental — calibrado a ojo sobre la foto. 16 columnas iguales por
// arco, en el mismo orden que ARCO_SUPERIOR / ARCO_INFERIOR_VISUAL.
const BANDA_SUPERIOR = { x0: 0.145, x1: 0.865, y0: 0.105, y1: 0.335 };
const BANDA_INFERIOR = { x0: 0.145, x1: 0.865, y0: 0.585, y1: 0.895 };

function posicionDiente(indice: number, banda: typeof BANDA_SUPERIOR) {
  const anchoCol = (banda.x1 - banda.x0) / 16;
  return {
    left: `${(banda.x0 + anchoCol * indice) * 100}%`,
    width: `${anchoCol * 100}%`,
    top: `${banda.y0 * 100}%`,
    height: `${(banda.y1 - banda.y0) * 100}%`,
  };
}

// Redondeo asimétrico que aproxima la silueta de un diente (corona
// redondeada arriba, borde más angosto abajo) en vez de un cuadro recto.
const FORMA_DIENTE = "50% 50% 40% 40% / 60% 60% 20% 20%";

function estiloDiente(estado: EstadoDiente, activo: boolean): CSSProperties {
  const est = ESTADO_DIENTE[estado];
  if (activo) {
    return {
      borderRadius: FORMA_DIENTE,
      backgroundColor: "rgba(0,0,0,0.42)",
      border: `2px solid ${est.ring}`,
      boxShadow: `0 0 10px rgba(${est.glow},0.8)`,
    };
  }
  if (estado === "sano") {
    return { borderRadius: FORMA_DIENTE, backgroundColor: "transparent", border: "1px solid transparent" };
  }
  return {
    borderRadius: FORMA_DIENTE,
    backgroundColor: `rgba(${est.glow},0.38)`,
    border: `1px solid ${est.ring}`,
  };
}

// Etiquetas con línea + círculo (como una carta dental) arriba y abajo
// de la foto, para identificar el número de cada diente de un vistazo.
const ALTURA_ETIQUETAS = 50;
const LINEA_CERCA = 13;
const LINEA_LEJOS = 29;

function centroColumna(indice: number, banda: typeof BANDA_SUPERIOR) {
  const anchoCol = (banda.x1 - banda.x0) / 16;
  return (banda.x0 + anchoCol * (indice + 0.5)) * 100;
}

function EtiquetaDiente({
  numero,
  xPercent,
  nivel,
  arriba,
  estado,
  activo,
  onClick,
}: {
  numero: number;
  xPercent: number;
  nivel: 0 | 1;
  arriba: boolean;
  estado: EstadoDiente;
  activo: boolean;
  onClick: () => void;
}) {
  const est = ESTADO_DIENTE[estado];
  const largoLinea = nivel === 0 ? LINEA_CERCA : LINEA_LEJOS;
  const colorLinea = activo || estado !== "sano" ? est.ring : "rgba(255,255,255,0.3)";
  const circuloEstilo: CSSProperties = activo
    ? { backgroundColor: est.ring, borderColor: est.ring, color: "#15101f" }
    : estado === "sano"
      ? { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.35)", color: "rgba(255,255,255,0.75)" }
      : { backgroundColor: `rgba(${est.glow},0.22)`, borderColor: est.ring, color: est.ring };

  return (
    <>
      <span
        className="pointer-events-none absolute"
        style={{
          left: `${xPercent}%`,
          transform: "translateX(-50%)",
          width: 1,
          height: largoLinea,
          backgroundColor: colorLinea,
          top: arriba ? ALTURA_ETIQUETAS - largoLinea : 0,
        }}
      />
      <button
        onClick={onClick}
        aria-label={`Diente ${numero}`}
        className="absolute flex items-center justify-center rounded-full border text-[8px] font-semibold leading-none transition-colors"
        style={{
          left: `${xPercent}%`,
          transform: "translateX(-50%)",
          width: 17,
          height: 17,
          top: arriba ? ALTURA_ETIQUETAS - largoLinea - 17 : largoLinea,
          ...circuloEstilo,
        }}
      >
        {numero}
      </button>
    </>
  );
}

export function Odontograma({ paciente }: { paciente: Paciente }) {
  const [seleccionado, setSeleccionado] = useState<number>(16);
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
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Odontograma clínico</div>
          <div className="text-[13px] text-white/70">
            {paciente.nombre} {paciente.folio ? `· ficha ${paciente.folio}` : ""}
          </div>
        </div>

        <div className="relative mt-4">
          <div className="relative" style={{ height: ALTURA_ETIQUETAS }}>
            {ARCO_SUPERIOR.map((n, i) => (
              <EtiquetaDiente
                key={n}
                numero={n}
                xPercent={centroColumna(i, BANDA_SUPERIOR)}
                nivel={(i % 2) as 0 | 1}
                arriba
                estado={historial[n]?.estado ?? "sano"}
                activo={n === seleccionado}
                onClick={() => seleccionar(n)}
              />
            ))}
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/odontograma-hud.jpg"
              alt="Odontograma"
              className="block w-full select-none"
              style={{ aspectRatio: "1300 / 799" }}
              draggable={false}
            />

            {ARCO_SUPERIOR.map((n, i) => (
              <button
                key={n}
                onClick={() => seleccionar(n)}
                aria-label={`Diente ${n}`}
                className="absolute transition-colors"
                style={{ ...posicionDiente(i, BANDA_SUPERIOR), ...estiloDiente(historial[n]?.estado ?? "sano", n === seleccionado) }}
              />
            ))}
            {ARCO_INFERIOR_VISUAL.map((n, i) => (
              <button
                key={n}
                onClick={() => seleccionar(n)}
                aria-label={`Diente ${n}`}
                className="absolute transition-colors"
                style={{ ...posicionDiente(i, BANDA_INFERIOR), ...estiloDiente(historial[n]?.estado ?? "sano", n === seleccionado) }}
              />
            ))}
          </div>

          <div className="relative" style={{ height: ALTURA_ETIQUETAS }}>
            {ARCO_INFERIOR_VISUAL.map((n, i) => (
              <EtiquetaDiente
                key={n}
                numero={n}
                xPercent={centroColumna(i, BANDA_INFERIOR)}
                nivel={(i % 2) as 0 | 1}
                arriba={false}
                estado={historial[n]?.estado ?? "sano"}
                activo={n === seleccionado}
                onClick={() => seleccionar(n)}
              />
            ))}
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
              Diente {seleccionado} (FDI)
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
