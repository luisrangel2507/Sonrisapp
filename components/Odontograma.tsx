"use client";

import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { Plus } from "lucide-react";
import {
  ARCO_SUPERIOR,
  ARCO_INFERIOR,
  ESTADO_DIENTE,
  POLIGONOS_DIENTE,
  type EstadoDiente,
  type HistorialDental,
  type HistorialEntrada,
} from "@/lib/dental";
import type { Paciente } from "@/lib/types";
import { fechaSoloDia } from "@/lib/fechas";

// Arco inferior en orden de despliegue (espejo del arco superior para
// que cada diente quede alineado en vertical con su pareja de arriba).
const ARCO_INFERIOR_VISUAL = [...ARCO_INFERIOR].reverse();

function formatearFecha(fecha: string) {
  return fechaSoloDia(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

const CENTRO_X_DIENTE: Record<number, number> = {
  11: 45.3, 12: 38.11, 13: 32.58, 14: 26.76, 15: 22.53, 16: 19.61, 17: 16.67, 18: 14.16,
  21: 53.97, 22: 62.28, 23: 68.15, 24: 72.65, 25: 77.91, 26: 80.82, 27: 83.82, 28: 85.9,
  31: 52.89, 32: 59.39, 33: 65.19, 34: 70.33, 35: 74.54, 36: 78.04, 37: 80.94, 38: 83.71,
  41: 46.44, 42: 40.84, 43: 35.3, 44: 29.38, 45: 25.66, 46: 21.98, 47: 19.12, 48: 16.9,
};

// Cada diente en la vista de carta clínica ahora se dibuja en 3 partes
// apiladas (como en las cartas dentales anatómicas de referencia): la
// corona vista de frente (0-18), la cara oclusal/incisal vista desde
// arriba con sus surcos (18-32) y la raíz (32-64) — así se ven todas
// las caras del diente de un vistazo, no solo un contorno genérico.
// La forma varía según la posición dentro del cuadrante (último dígito
// del número FDI: 11→1 incisivo central … 18→8 tercer molar).
// Ojo con la orientación: arriba (y≈0) va el borde incisal/oclusal —
// donde están las cúspides y puntas —, y abajo (y≈18) va el cuello,
// más ancho, que se une con la cara oclusal. Al revés no se parece a
// la carta de referencia.
const CORONA_POR_POSICION: Record<number, string> = {
  // 1 — incisivo central: ápice redondeado angosto, se ensancha hacia el cuello.
  1: "M10.3,1.5 Q10.3,0.3 12,0.3 Q13.7,0.3 13.7,1.5 Q13.7,3 14.3,5 Q15,7.5 15,10 Q15,13.5 14.2,15.8 Q13.5,17.8 12,17.8 Q10.5,17.8 9.8,15.8 Q9,13.5 9,10 Q9,7.5 9.7,5 Q10.3,3 10.3,1.5 Z",
  // 2 — incisivo lateral: igual pero más angosto.
  2: "M10.6,1.4 Q10.6,0.3 12,0.3 Q13.4,0.3 13.4,1.4 Q13.4,2.7 13.9,4.5 Q14.4,6.8 14.4,9 Q14.4,12.3 13.7,14.5 Q13.1,16.3 12,16.3 Q10.9,16.3 10.3,14.5 Q9.6,12.3 9.6,9 Q9.6,6.8 10.1,4.5 Q10.6,2.7 10.6,1.4 Z",
  // 3 — canino: una sola cúspide puntiaguda arriba, se abre hacia el cuello.
  3: "M12,0 L15.3,5 Q16.3,6.8 16.5,9 L16.7,13 Q16.7,16 15,17.3 Q13.7,18 12,18 Q10.3,18 9,17.3 Q7.3,16 7.3,13 L7.5,9 Q7.7,6.8 8.7,5 Z",
  // 4 — primer premolar: dos cúspides suaves arriba (vestibular + palatina).
  4: "M8,3 Q8,1 9.5,0.5 Q10.8,0.1 12,1.8 Q13.2,0.1 14.5,0.5 Q16,1 16,3 L16,9 Q16,13.5 15,16 Q14,18 12,18 Q10,18 9,16 Q8,13.5 8,9 Z",
  // 5 — segundo premolar: parecido, un poco más chico.
  5: "M8.3,2.7 Q8.3,1 9.6,0.5 Q10.8,0.1 12,1.6 Q13.2,0.1 14.4,0.5 Q15.7,1 15.7,2.7 L15.7,8 Q15.7,12 14.8,14.3 Q13.9,16.3 12,16.3 Q10.1,16.3 9.2,14.3 Q8.3,12 8.3,8 Z",
  // 6 — primer molar: corona ancha con varias cúspides arriba (zigzag).
  6: "M5.5,4 Q5.5,1.5 7.5,0.8 Q9,0.3 9.8,2.5 Q10.5,4.3 11,3 Q11.5,1.5 12,1.5 Q12.5,1.5 13,3 Q13.5,4.3 14.2,2.5 Q15,0.3 16.5,0.8 Q18.5,1.5 18.5,4 L18.5,9.5 Q18.5,14 17,16.5 Q15.5,18.5 12,18.5 Q8.5,18.5 7,16.5 Q5.5,14 5.5,9.5 Z",
  // 7 — segundo molar: igual que el primero, un poco más chico.
  7: "M6.3,4 Q6.3,1.8 8,1.1 Q9.3,0.6 10,2.6 Q10.6,4.2 11,3 Q11.5,1.7 12,1.7 Q12.5,1.7 13,3 Q13.4,4.2 14,2.6 Q14.7,0.6 16,1.1 Q17.7,1.8 17.7,4 L17.7,9 Q17.7,13.2 16.3,15.5 Q15,17.7 12,17.7 Q9,17.7 7.7,15.5 Q6.3,13.2 6.3,9 Z",
  // 8 — tercer molar (cordal): compacto, una cúspide dominante e irregular.
  8: "M8,4.5 Q8,2 10,1 Q11.3,0.4 12,2.3 Q12.5,3.7 13.3,2.5 Q14.3,1 15.7,1.8 Q16.7,2.4 16.7,4.5 L16.7,8.5 Q16.7,12.5 15.5,14.7 Q14.3,17 12,17 Q9.7,17 8.5,14.7 Q7.3,12.5 7.3,8.5 Z",
};

// Raíz de cada diente — única y cónica para incisivos/caninos/premolares,
// bifurcada (dos raíces) para los molares.
const RAIZ_POR_POSICION: Record<number, string> = {
  1: "M9.5,0 L14.5,0 L14,6 Q13.7,16 12.7,24 Q12.3,28 12,29 Q11.7,28 11.3,24 Q10.3,16 10,6 Z",
  2: "M9.8,0 L14.2,0 L13.8,6 Q13.3,15 12.5,23 Q12.2,27 12,28.5 Q11.8,27 11.5,23 Q10.7,15 10.2,6 Z",
  3: "M9,0 L15,0 L14.6,7 Q14.2,17 13.2,25 Q12.6,29 12,30 Q11.4,29 10.8,25 Q9.8,17 9.4,7 Z",
  4: "M8.5,0 L15.5,0 L15,6 Q14.6,15 13.3,21 Q12.5,25 12,26 Q11.5,25 10.7,21 Q9.4,15 9,6 Z",
  5: "M9,0 L15,0 L14.6,5.5 Q14.2,13 13,18.5 Q12.3,22 12,23 Q11.7,22 11,18.5 Q9.8,13 9.4,5.5 Z",
  6: "M7,0 L17,0 L16.5,5 Q16.2,7.5 15,8.5 L15.8,13 Q16.3,18 15.6,23 Q15.2,26 14.6,25 Q14,22 13.7,18 Q13.3,13 13,9 L11,9 Q10.7,13 10.3,18 Q10,22 9.4,25 Q8.8,26 8.4,23 Q7.7,18 8.2,13 L9,8.5 Q7.8,7.5 7.5,5 Z",
  7: "M7.3,0 L16.7,0 L16.3,4.5 Q16,6.8 14.9,7.7 L15.6,11.5 Q16,15.5 15.4,19.5 Q15,22 14.5,21 Q14,18.5 13.7,15.5 Q13.3,11.5 13,8 L11,8 Q10.7,11.5 10.3,15.5 Q10,18.5 9.5,21 Q9,22 8.6,19.5 Q8,15.5 8.4,11.5 L9.1,7.7 Q8,6.8 7.7,4.5 Z",
  8: "M8,0 L16,0 L15.6,4 Q15.3,6 14.4,6.8 L14.9,10 Q15.2,13 14.7,16 Q14.4,18 14,17 Q13.6,15 13.4,12.5 Q13.1,9 13,7 L11,7 Q10.9,9 10.6,12.5 Q10.4,15 10,17 Q9.6,18 9.3,16 Q8.8,13 9.1,10 L9.6,6.8 Q8.7,6 8.4,4 Z",
};

// Radio de la cara oclusal (vista desde arriba, la superficie de
// masticación) por posición — más redonda y grande en los molares.
const OCLUSAL_RADIO_POR_POSICION: Record<number, { rx: number; ry: number }> = {
  1: { rx: 4.6, ry: 3.0 },
  2: { rx: 4.0, ry: 2.6 },
  3: { rx: 4.8, ry: 3.2 },
  4: { rx: 5.0, ry: 3.4 },
  5: { rx: 4.8, ry: 3.2 },
  6: { rx: 5.8, ry: 4.0 },
  7: { rx: 5.4, ry: 3.7 },
  8: { rx: 5.0, ry: 3.4 },
};

function VistaOclusal({ posicion }: { posicion: number }) {
  const { rx, ry } = OCLUSAL_RADIO_POR_POSICION[posicion] ?? OCLUSAL_RADIO_POR_POSICION[1];
  return (
    <g transform="translate(12,7)">
      <ellipse cx={0} cy={0} rx={rx} ry={ry} />
      {posicion === 3 && (
        <line x1={0} y1={-ry * 0.5} x2={0} y2={ry * 0.5} strokeWidth={0.4} fill="none" />
      )}
      {(posicion === 4 || posicion === 5) && (
        <path d={`M${-rx * 0.75},0 Q0,${ry * 0.35} ${rx * 0.75},0`} strokeWidth={0.4} fill="none" />
      )}
      {(posicion === 6 || posicion === 7 || posicion === 8) && (
        <path
          d={`M${-rx * 0.7},0 Q0,${ry * 0.3} ${rx * 0.7},0 M0,${-ry * 0.65} Q${-rx * 0.2},0 0,${ry * 0.65}`}
          strokeWidth={0.4}
          fill="none"
        />
      )}
    </g>
  );
}

// Diente completo apilando corona / cara oclusal / raíz, para que se
// vean sus tres caras principales de un vistazo (como en la carta
// dental de referencia), en vez de un solo contorno genérico.
function IconoDiente({ numero }: { numero: number }) {
  const posicion = numero % 10;
  const corona = CORONA_POR_POSICION[posicion] ?? CORONA_POR_POSICION[1];
  const raiz = RAIZ_POR_POSICION[posicion] ?? RAIZ_POR_POSICION[1];
  return (
    <svg viewBox="0 0 24 64" width="100%" height="100%">
      <path d={corona} strokeLinejoin="round" />
      <g transform="translate(0,18)">
        <VistaOclusal posicion={posicion} />
      </g>
      <g transform="translate(0,32)">
        <path d={raiz} strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function CasillaCarta({
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
  const etiqueta = (
    <span className={`text-[9px] font-semibold ${activo ? "text-white" : "text-white/50"}`}>{numero}</span>
  );
  return (
    <button onClick={onClick} aria-label={`Diente ${numero}`} className="flex shrink-0 flex-col items-center gap-1">
      {arriba && etiqueta}
      <div
        style={{
          width: 22,
          height: 58,
          color: est.ring,
          fill: activo ? `rgba(${est.glow},0.55)` : estado === "sano" ? "rgba(255,255,255,0.06)" : `rgba(${est.glow},0.28)`,
          stroke: est.ring,
          strokeWidth: activo ? 1.1 : 0.6,
          filter: activo ? `drop-shadow(0 0 4px rgba(${est.glow},0.7))` : undefined,
          transition: "filter 0.15s",
        }}
      >
        <IconoDiente numero={numero} />
      </div>
      {!arriba && etiqueta}
    </button>
  );
}

function estiloPoligono(estado: EstadoDiente, activo: boolean): CSSProperties {
  const est = ESTADO_DIENTE[estado];
  if (activo) {
    return {
      fill: "rgba(0,0,0,0.42)",
      stroke: est.ring,
      strokeWidth: 0.4,
      filter: `drop-shadow(0 0 2px rgba(${est.glow},0.8))`,
    };
  }
  if (estado === "sano") {
    return { fill: "transparent", stroke: "transparent", strokeWidth: 0 };
  }
  if (estado === "ausente") {
    // Negro sólido tipo "hueco" con contorno bien definido, para que se
    // note a propósito que ahí falta un diente y no se confunda con una
    // sombra de la foto.
    return { fill: "#0A0A0F", stroke: est.ring, strokeWidth: 0.45 };
  }
  return { fill: `rgba(${est.glow},0.38)`, stroke: est.ring, strokeWidth: 0.25 };
}

// Etiquetas con línea + círculo (como una carta dental) arriba y abajo
// de la foto, para identificar el número de cada diente de un vistazo.
// Los círculos van todos parejos en una sola fila (para que no se vean
// "brincados"); la línea de cada uno viaja en diagonal hasta la
// posición real del diente en la foto.
const ALTURA_ETIQUETAS = 46;
const RADIO_CIRCULO = 8;

function xParejo(indice: number) {
  return ((indice + 0.5) / 16) * 100;
}

function FilaEtiquetas({
  numeros,
  arriba,
  historial,
  seleccionado,
  onSeleccionar,
}: {
  numeros: number[];
  arriba: boolean;
  historial: HistorialDental;
  seleccionado: number;
  onSeleccionar: (n: number) => void;
}) {
  const yCirculo = arriba ? RADIO_CIRCULO + 2 : ALTURA_ETIQUETAS - RADIO_CIRCULO - 2;
  const yLineaInicio = arriba ? yCirculo + RADIO_CIRCULO : yCirculo - RADIO_CIRCULO;
  const yLineaFin = arriba ? ALTURA_ETIQUETAS : 0;

  return (
    <div className="relative" style={{ height: ALTURA_ETIQUETAS }}>
      <svg viewBox={`0 0 100 ${ALTURA_ETIQUETAS}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {numeros.map((n, i) => {
          const est = ESTADO_DIENTE[historial[n]?.estado ?? "sano"];
          const activo = n === seleccionado;
          const color = activo || historial[n]?.estado ? est.ring : "rgba(255,255,255,0.25)";
          return (
            <line
              key={n}
              x1={xParejo(i)}
              y1={yLineaInicio}
              x2={CENTRO_X_DIENTE[n]}
              y2={yLineaFin}
              stroke={color}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      {numeros.map((n, i) => {
        const estado = historial[n]?.estado ?? "sano";
        const est = ESTADO_DIENTE[estado];
        const activo = n === seleccionado;
        const circuloEstilo: CSSProperties = activo
          ? { backgroundColor: est.ring, borderColor: est.ring, color: "#15101f" }
          : estado === "sano"
            ? { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.35)", color: "rgba(255,255,255,0.75)" }
            : { backgroundColor: `rgba(${est.glow},0.22)`, borderColor: est.ring, color: est.ring };
        return (
          <button
            key={n}
            onClick={() => onSeleccionar(n)}
            aria-label={`Diente ${n}`}
            className="absolute flex items-center justify-center rounded-full border text-[8px] font-semibold leading-none transition-colors"
            style={{
              left: `${xParejo(i)}%`,
              transform: "translate(-50%, -50%)",
              top: yCirculo,
              width: RADIO_CIRCULO * 2,
              height: RADIO_CIRCULO * 2,
              ...circuloEstilo,
            }}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

// Fila de 16 dientes partida en dos cuadrantes con una línea divisoria
// bien visible en medio — como en las cartas dentales clásicas, para
// que se distingan las 4 zonas de un vistazo (no solo un espacio).
function FilaCarta({
  numeros,
  arriba,
  historial,
  seleccionado,
  onSeleccionar,
}: {
  numeros: number[];
  arriba: boolean;
  historial: HistorialDental;
  seleccionado: number;
  onSeleccionar: (n: number) => void;
}) {
  return (
    <div className="flex w-max items-stretch justify-center gap-[3px]">
      {numeros.map((n, i) => (
        <Fragment key={n}>
          {i === 8 && <div className="mx-2 w-px self-stretch bg-white/20" />}
          <CasillaCarta
            numero={n}
            arriba={arriba}
            estado={historial[n]?.estado ?? "sano"}
            activo={n === seleccionado}
            onClick={() => onSeleccionar(n)}
          />
        </Fragment>
      ))}
    </div>
  );
}

export function Odontograma({ paciente }: { paciente: Paciente }) {
  const [vista, setVista] = useState<"foto" | "carta">("foto");
  const [seleccionado, setSeleccionado] = useState<number>(16);
  const [historial, setHistorial] = useState<HistorialDental>({});
  const [cargando, setCargando] = useState(true);
  const [formAbierto, setFormAbierto] = useState(false);
  const [tipo, setTipo] = useState("");
  const [nota, setNota] = useState("");
  const [estadoNuevo, setEstadoNuevo] = useState<EstadoDiente | "">("");
  const [aplicarTodos, setAplicarTodos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [tipoEdit, setTipoEdit] = useState("");
  const [notaEdit, setNotaEdit] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

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

  // Solo las condiciones que de verdad tiene marcadas este paciente —
  // mostrar las 15 posibles siempre hacía el legend enorme y difícil
  // de leer. "sano" no cuenta: no se pinta de color en la foto.
  const estadosPresentes = new Set<EstadoDiente>(
    Object.values(historial)
      .map((d) => d.estado)
      .filter((e) => e !== "sano")
  );

  async function agregarRegistro() {
    if (!tipo.trim() || guardando) return;
    setGuardando(true);
    const url = aplicarTodos
      ? `/api/pacientes/${paciente.id}/dientes/masivo`
      : `/api/pacientes/${paciente.id}/dientes/${seleccionado}`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, nota: nota || null, estado: estadoNuevo || undefined }),
    });
    setTipo("");
    setNota("");
    setEstadoNuevo("");
    setAplicarTodos(false);
    setFormAbierto(false);
    setGuardando(false);
    await cargarHistorial();
  }

  function seleccionar(n: number) {
    setSeleccionado(n);
    setFormAbierto(false);
    setEditandoId(null);
  }

  function abrirEdicion(e: HistorialEntrada) {
    setFormAbierto(false);
    setEditandoId(e.id);
    setTipoEdit(e.tipo);
    setNotaEdit(e.nota ?? "");
  }

  async function guardarEdicion() {
    if (!tipoEdit.trim() || guardandoEdit || editandoId == null) return;
    setGuardandoEdit(true);
    await fetch(`/api/pacientes/${paciente.id}/dientes/${seleccionado}/${editandoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: tipoEdit, nota: notaEdit || null }),
    });
    setEditandoId(null);
    setGuardandoEdit(false);
    await cargarHistorial();
  }

  async function eliminarEntrada(id: number) {
    if (eliminandoId) return;
    // NOM-024: nada se borra de verdad — "eliminar" anula el registro
    // con un motivo, pero se sigue viendo (marcado) en el historial.
    const motivo = window.prompt(
      "Motivo de la anulación (el registro no se borra, queda marcado como anulado en el historial):"
    );
    if (!motivo || !motivo.trim()) return;
    setEliminandoId(id);
    await fetch(`/api/pacientes/${paciente.id}/dientes/${seleccionado}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: motivo.trim() }),
    });
    setEditandoId(null);
    setEliminandoId(null);
    await cargarHistorial();
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
            {(["foto", "carta"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  vista === v ? "bg-[#7C5CE0] text-white" : "text-white/50"
                }`}
              >
                {v === "foto" ? "Foto" : "Carta clínica"}
              </button>
            ))}
          </div>
        </div>

        {vista === "foto" ? (
          <div className="relative mt-4">
            <FilaEtiquetas
              numeros={ARCO_SUPERIOR}
              arriba
              historial={historial}
              seleccionado={seleccionado}
              onSeleccionar={seleccionar}
            />

            <div className="relative overflow-hidden rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/odontograma-hud.jpg"
                alt="Odontograma"
                className="block w-full select-none"
                style={{ aspectRatio: "1300 / 799" }}
                draggable={false}
              />

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
              >
                {[...ARCO_SUPERIOR, ...ARCO_INFERIOR_VISUAL].map((n) => (
                  <polygon
                    key={n}
                    points={POLIGONOS_DIENTE[n]}
                    onClick={() => seleccionar(n)}
                    role="button"
                    aria-label={`Diente ${n}`}
                    className="cursor-pointer transition-colors"
                    style={estiloPoligono(historial[n]?.estado ?? "sano", n === seleccionado)}
                  />
                ))}
              </svg>
            </div>

            <FilaEtiquetas
              numeros={ARCO_INFERIOR_VISUAL}
              arriba={false}
              historial={historial}
              seleccionado={seleccionado}
              onSeleccionar={seleccionar}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-4">
            <FilaCarta
              numeros={ARCO_SUPERIOR}
              arriba
              historial={historial}
              seleccionado={seleccionado}
              onSeleccionar={seleccionar}
            />
            <div className="border-t border-dashed border-white/15" />
            <FilaCarta
              numeros={ARCO_INFERIOR_VISUAL}
              arriba={false}
              historial={historial}
              seleccionado={seleccionado}
              onSeleccionar={seleccionar}
            />
          </div>
        )}

        {estadosPresentes.size > 0 ? (
          <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-white/10 pt-4">
            {Object.entries(ESTADO_DIENTE)
              .filter(([key]) => estadosPresentes.has(key as EstadoDiente))
              .map(([key, v]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: v.ring }} />
                  <span className="text-[11px] text-white/50">{v.label}</span>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-5 border-t border-white/10 pt-4 text-center text-[11px] text-white/30">
            Sin afectaciones registradas — todos los dientes sanos.
          </p>
        )}
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
            {cargando
              ? "…"
              : (() => {
                  const n = info?.entradas.filter((e) => e.vigente).length || 0;
                  return `${n} registro${n === 1 ? "" : "s"}`;
                })()}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {cargando ? (
            <p className="text-sm text-white/50">Cargando historial…</p>
          ) : info?.entradas?.length ? (
            info.entradas.map((e) =>
              editandoId === e.id ? (
                <div key={e.id} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] text-white/40">
                    Guardar crea una corrección nueva y conserva el registro original; anular no lo borra, solo lo marca.
                  </p>
                  <input
                    value={tipoEdit}
                    onChange={(ev) => setTipoEdit(ev.target.value)}
                    placeholder="Tipo de tratamiento"
                    className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
                  />
                  <textarea
                    value={notaEdit}
                    onChange={(ev) => setNotaEdit(ev.target.value)}
                    placeholder="Nota (opcional)"
                    rows={2}
                    className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={guardarEdicion}
                      disabled={!tipoEdit.trim() || guardandoEdit}
                      className="flex-1 rounded-full bg-[#7C5CE0] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                    >
                      {guardandoEdit ? "Guardando…" : "Guardar corrección"}
                    </button>
                    <button
                      onClick={() => eliminarEntrada(e.id)}
                      disabled={eliminandoId === e.id}
                      className="rounded-full border border-[#E8508C]/50 px-4 py-2 text-[13px] font-medium text-[#E8508C] disabled:opacity-50"
                    >
                      {eliminandoId === e.id ? "Eliminando…" : "Eliminar"}
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-white/70"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                (() => {
                  const anulado = !e.vigente && !!e.motivo_anulacion;
                  const corregido = !e.vigente && !e.motivo_anulacion;
                  const contenido = (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium ${e.vigente ? "text-white/90" : "text-white/40 line-through"}`}>
                          {e.tipo}
                        </span>
                        <span className="shrink-0 text-[11px] text-white/40">{formatearFecha(e.fecha)}</span>
                      </div>
                      {e.nota && (
                        <p className={`mt-0.5 text-[13px] ${e.vigente ? "text-white/50" : "text-white/30 line-through"}`}>
                          {e.nota}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-white/30">
                        {e.creado_por_nombre && <span>Registrado por {e.creado_por_nombre}</span>}
                        {e.vigente && e.reemplaza_a != null && <span className="text-[#5FE0A0]">Corrección de un registro anterior</span>}
                        {anulado && (
                          <span className="text-[#E8508C]">
                            Anulado por {e.anulado_por_nombre}: {e.motivo_anulacion}
                          </span>
                        )}
                        {corregido && <span>Corregido — reemplazado por un registro nuevo</span>}
                      </div>
                    </>
                  );
                  if (!e.vigente) {
                    return (
                      <div key={e.id} className="block w-full border-l-2 border-white/5 pl-3 opacity-70">
                        {contenido}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={e.id}
                      onClick={() => abrirEdicion(e)}
                      className="block w-full border-l-2 border-white/10 pl-3 text-left transition-colors hover:border-white/30"
                    >
                      {contenido}
                    </button>
                  );
                })()
              )
            )
          ) : (
            <p className="text-sm text-white/50">Sin historial registrado — diente sano.</p>
          )}
        </div>

        {formAbierto ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/70">
              <input
                type="checkbox"
                checked={aplicarTodos}
                onChange={(e) => setAplicarTodos(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-[#7C5CE0]"
              />
              Aplicar a los 32 dientes (limpieza, fluorización, etc.)
            </label>
            {!aplicarTodos && (
              <select
                value={estadoNuevo || info?.estado || "sano"}
                onChange={(e) => setEstadoNuevo(e.target.value as EstadoDiente)}
                className="w-full rounded-xl border border-white/15 bg-[#15101f] px-3 py-2 text-sm text-white outline-none"
              >
                {Object.entries(ESTADO_DIENTE).map(([key, v]) => (
                  <option key={key} value={key}>
                    {v.label}
                  </option>
                ))}
              </select>
            )}
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
            <div className="flex gap-2 pt-1">
              <button
                onClick={agregarRegistro}
                disabled={!tipo.trim() || guardando}
                className="flex-1 rounded-full bg-[#7C5CE0] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {guardando ? "Guardando…" : aplicarTodos ? "Guardar en los 32 dientes" : "Guardar"}
              </button>
              <button
                onClick={() => {
                  setFormAbierto(false);
                  setAplicarTodos(false);
                }}
                className="rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-white/70"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setFormAbierto(true);
              setEditandoId(null);
              setEstadoNuevo(info?.estado ?? "sano");
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 py-2.5 text-[13px] font-semibold text-white/90"
          >
            <Plus size={14} /> Agregar registro a este diente
          </button>
        )}
      </div>
    </div>
  );
}
