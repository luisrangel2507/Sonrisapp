"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Eraser, Hand, Minus, Pencil, Save, Stamp, Type, Undo2, Trash2 } from "lucide-react";
import { ARCO_SUPERIOR, ARCO_INFERIOR, SIMBOLO_DIENTE, type HistorialDental, type SimboloEstado } from "@/lib/dental";
import { IconoDiente } from "@/components/Odontograma";

// ---- Geometría de la carta (unidades del viewBox) ----
const ANCHO_COL = 38;
const HUECO_LINEA_MEDIA = 14;
const MARGEN = 10;
const ANCHO_TOTAL = MARGEN * 2 + 16 * ANCHO_COL + HUECO_LINEA_MEDIA;
const ALTO_TOTAL = 268;
const LINEA_MEDIA_Y = 132;
const DIENTE_W = 30;
const DIENTE_H = 80;
const CAJA_SUP = { y: 4, h: 18 };
const DIENTE_SUP_Y = 40;
const DIENTE_INF_Y = 144;
const CAJA_INF = { y: 246, h: 18 };

const ARCO_INFERIOR_VISUAL = [...ARCO_INFERIOR].reverse();

function colX(i: number) {
  return MARGEN + i * ANCHO_COL + (i >= 8 ? HUECO_LINEA_MEDIA : 0);
}

function columnaDeX(x: number): number | null {
  for (let i = 0; i < 16; i++) {
    if (x >= colX(i) && x < colX(i) + ANCHO_COL) return i;
  }
  return null;
}

function dienteEn(x: number, y: number): number | null {
  const col = columnaDeX(x);
  if (col === null) return null;
  return y < LINEA_MEDIA_Y ? ARCO_SUPERIOR[col] : ARCO_INFERIOR_VISUAL[col];
}

// ---- Modelo ----
export const COLORES = [
  { valor: "#D62839", label: "Rojo" },
  { valor: "#2F5DD0", label: "Azul" },
  { valor: "#2E9E5B", label: "Verde" },
] as const;
const ROJO = COLORES[0].valor;
const AZUL = COLORES[1].valor;

type FormaSello =
  | "x"
  | "linea_h"
  | "doble_linea"
  | "linea_v"
  | "oblicua"
  | "flecha_arriba"
  | "flecha_abajo"
  | "flecha_der"
  | "flecha_izq"
  | "flecha_curva"
  | "chevron"
  | "parentesis"
  | "circulo"
  | "circulo_relleno"
  | "circulo_halo"
  | "triangulo"
  | "zigzag"
  | "numeral"
  | "puente";

type Elemento =
  | { t: "trazo"; color: string; puntos: [number, number][] }
  | { t: "linea"; color: string; x1: number; y1: number; x2: number; y2: number }
  | { t: "sello"; color: string; forma: FormaSello; x: number; y: number }
  | { t: "texto"; color: string; texto: string; diente: number };

type Herramienta = "mover" | "lapiz" | "linea" | "sello" | "texto" | "borrar";

const SELLOS: { forma: FormaSello; label: string }[] = [
  { forma: "circulo_relleno", label: "Caries / restauración" },
  { forma: "circulo_halo", label: "Restauración mal estado" },
  { forma: "x", label: "Ausente / extracción" },
  { forma: "doble_linea", label: "Remanente radicular" },
  { forma: "linea_h", label: "Edéntulo / desbordante" },
  { forma: "linea_v", label: "Tratamiento de conductos" },
  { forma: "oblicua", label: "Diente impactado" },
  { forma: "zigzag", label: "Fractura" },
  { forma: "circulo", label: "Corona" },
  { forma: "puente", label: "Puente fijo" },
  { forma: "flecha_curva", label: "Giroversión" },
  { forma: "flecha_der", label: "Migración →" },
  { forma: "flecha_izq", label: "Migración ←" },
  { forma: "flecha_arriba", label: "Intrusión" },
  { forma: "flecha_abajo", label: "Extrusión" },
  { forma: "chevron", label: "Alimento impactado" },
  { forma: "parentesis", label: "Diastema" },
  { forma: "numeral", label: "Supernumerario" },
  { forma: "triangulo", label: "Endodoncia" },
];

const ABREVIATURAS = [
  "S", "RR", "MAC", "MIC", "M1", "M2", "M3", "IMP",
  "ATR", "ABR", "ERS", "ABF", "TCC", "PC", "PP",
  "CT", "CC", "CPP", "CMA", "CMP", "CF", "C¾", "CP", "CR", "CM",
  "PMA", "PMP", "PM",
];

// Estados del odontograma 3D/foto que, por convención, van en rojo
// (mal estado / por tratar); el resto en azul.
const ESTADOS_ROJOS = new Set([
  "extraccion_indicada", "caries_recurrente", "caries", "sellante_mal", "endodoncia_mal",
  "corona_mala", "protesis_fija_mala", "protesis_removible_mala", "implante_malo",
  "incrustacion_mala", "para_corona",
]);

const FORMA_DESDE_SIMBOLO: Record<string, FormaSello> = {
  linea: "linea_h",
  linea_punteada: "linea_v",
  x: "x",
  circulo_relleno: "circulo_relleno",
  circulo_relleno_halo: "circulo_halo",
  circulo_hueco: "circulo",
  doble_circulo: "puente",
  doble_linea: "doble_linea",
  triangulo: "triangulo",
  triangulo_relleno: "triangulo",
  flecha: "flecha_arriba",
};

// ---- Dibujo de un sello ----
function Sello({ forma, color, x, y }: { forma: FormaSello; color: string; x: number; y: number }) {
  const sw = 2;
  const p = { stroke: color, strokeWidth: sw, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const g = (children: React.ReactNode) => <g transform={`translate(${x},${y})`}>{children}</g>;
  switch (forma) {
    case "x":
      return g(<><line x1={-11} y1={-11} x2={11} y2={11} {...p} /><line x1={11} y1={-11} x2={-11} y2={11} {...p} /></>);
    case "linea_h":
      return g(<line x1={-15} y1={0} x2={15} y2={0} {...p} />);
    case "doble_linea":
      return g(<><line x1={-14} y1={-3} x2={14} y2={-3} {...p} /><line x1={-14} y1={3} x2={14} y2={3} {...p} /></>);
    case "linea_v":
      return g(<line x1={0} y1={-16} x2={0} y2={16} {...p} />);
    case "oblicua":
      return g(<line x1={-9} y1={16} x2={9} y2={-16} {...p} />);
    case "flecha_arriba":
      return g(<><line x1={0} y1={12} x2={0} y2={-10} {...p} /><path d="M-6,-4 L0,-11 L6,-4" {...p} /></>);
    case "flecha_abajo":
      return g(<><line x1={0} y1={-12} x2={0} y2={10} {...p} /><path d="M-6,4 L0,11 L6,4" {...p} /></>);
    case "flecha_der":
      return g(<><line x1={-12} y1={0} x2={10} y2={0} {...p} /><path d="M4,-6 L11,0 L4,6" {...p} /></>);
    case "flecha_izq":
      return g(<><line x1={12} y1={0} x2={-10} y2={0} {...p} /><path d="M-4,-6 L-11,0 L-4,6" {...p} /></>);
    case "flecha_curva":
      return g(<><path d="M-11,4 Q0,-12 10,2" {...p} /><path d="M4,-1 L10,2 L9,-5" {...p} /></>);
    case "chevron":
      return g(<path d="M-6,4 L0,-4 L6,4" {...p} />);
    case "parentesis":
      return g(<><path d="M-3,-14 Q-9,0 -3,14" {...p} /><path d="M3,-14 Q9,0 3,14" {...p} /></>);
    case "circulo":
      return g(<circle r={13} {...p} />);
    case "circulo_relleno":
      return g(<circle r={5} fill={color} stroke="none" />);
    case "circulo_halo":
      return g(<><circle r={7} fill="none" stroke={ROJO} strokeWidth={2} /><circle r={4.5} fill={AZUL} stroke="none" /></>);
    case "triangulo":
      return g(<path d="M0,-9 L8,7 L-8,7 Z" {...p} />);
    case "zigzag":
      return g(<path d="M-12,-4 L-6,4 L0,-4 L6,4 L12,-4" {...p} />);
    case "numeral":
      return g(<><circle r={8} {...p} /><text y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>#</text></>);
    case "puente":
      return g(<><rect x={-16} y={-3} width={6} height={6} {...p} /><line x1={-10} y1={0} x2={10} y2={0} {...p} /><rect x={10} y={-3} width={6} height={6} {...p} /></>);
  }
}

function MiniSello({ forma, color }: { forma: FormaSello; color: string }) {
  return (
    <svg viewBox="-18 -18 36 36" width={26} height={26}>
      <Sello forma={forma} color={color} x={0} y={0} />
    </svg>
  );
}

// ---- Componente ----
export function OdontogramaDibujo({
  pacienteId,
  historial,
  etiquetasEstado,
}: {
  pacienteId: number;
  historial: HistorialDental;
  etiquetasEstado: Record<string, { label: string }>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [pila, setPila] = useState<Elemento[][]>([]);
  const [actual, setActual] = useState<Elemento | null>(null);
  const [herramienta, setHerramienta] = useState<Herramienta>("lapiz");
  const [color, setColor] = useState<string>(ROJO);
  const [sello, setSello] = useState<FormaSello>("circulo_relleno");
  const [abreviatura, setAbreviatura] = useState("S");
  const [dienteSugerido, setDienteSugerido] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pendiente, setPendiente] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/pacientes/${pacienteId}/odontograma-dibujo`)
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        setElementos(d.elementos ?? []);
        if (d.actualizado_en) {
          setInfo(
            `Guardado ${new Date(d.actualizado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}${
              d.actualizado_por ? ` · ${d.actualizado_por}` : ""
            }`
          );
        }
      })
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [pacienteId]);

  function cambiar(nuevos: Elemento[]) {
    setPila((p) => [...p.slice(-49), elementos]);
    setElementos(nuevos);
    setPendiente(true);
  }

  function deshacer() {
    if (pila.length === 0) return;
    setElementos(pila[pila.length - 1]);
    setPila(pila.slice(0, -1));
    setPendiente(true);
  }

  async function guardar() {
    if (guardando) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/odontograma-dibujo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elementos }),
      });
      const d = await res.json();
      if (res.ok) {
        setPendiente(false);
        setInfo(
          `Guardado ${new Date(d.actualizado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}${
            d.actualizado_por ? ` · ${d.actualizado_por}` : ""
          }`
        );
      } else {
        setInfo(d.error ?? "No se pudo guardar");
      }
    } finally {
      setGuardando(false);
    }
  }

  function punto(e: ReactPointerEvent): [number, number] {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const r = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10];
  }

  function alPresionar(e: ReactPointerEvent<SVGSVGElement>) {
    if (herramienta === "mover" || herramienta === "borrar") return;
    const [x, y] = punto(e);
    if (herramienta === "lapiz") {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setActual({ t: "trazo", color, puntos: [[x, y]] });
    } else if (herramienta === "linea") {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setActual({ t: "linea", color, x1: x, y1: y, x2: x, y2: y });
    } else if (herramienta === "sello") {
      cambiar([...elementos, { t: "sello", color, forma: sello, x, y }]);
      setDienteSugerido(null);
    } else if (herramienta === "texto") {
      const diente = dienteEn(x, y);
      if (diente !== null) {
        cambiar([...elementos, { t: "texto", color, texto: abreviatura, diente }]);
        setDienteSugerido(null);
      }
    }
  }

  function alMover(e: ReactPointerEvent<SVGSVGElement>) {
    if (!actual) return;
    const [x, y] = punto(e);
    if (actual.t === "trazo") {
      const ult = actual.puntos[actual.puntos.length - 1];
      if (Math.hypot(x - ult[0], y - ult[1]) < 1.5) return;
      setActual({ ...actual, puntos: [...actual.puntos, [x, y]] });
    } else if (actual.t === "linea") {
      setActual({ ...actual, x2: x, y2: y });
    }
  }

  function alSoltar() {
    if (!actual) return;
    const valido =
      (actual.t === "trazo" && actual.puntos.length > 1) ||
      (actual.t === "linea" && Math.hypot(actual.x2 - actual.x1, actual.y2 - actual.y1) > 3);
    if (valido) cambiar([...elementos, actual]);
    setActual(null);
  }

  function borrar(indice: number) {
    if (herramienta !== "borrar") return;
    cambiar(elementos.filter((_, i) => i !== indice));
  }

  // Condiciones ya marcadas en el odontograma 3D/foto → listas para
  // colocar con su símbolo y color convencional.
  const sugerencias = useMemo(() => {
    return Object.entries(historial)
      .filter(([, d]) => d.estado && d.estado !== "sano")
      .map(([num, d]) => {
        const simbolo = (SIMBOLO_DIENTE as Record<string, SimboloEstado>)[d.estado];
        const colorSug = ESTADOS_ROJOS.has(d.estado) ? ROJO : AZUL;
        return {
          diente: Number(num),
          estado: d.estado,
          label: etiquetasEstado[d.estado]?.label ?? d.estado,
          color: colorSug,
          letra: simbolo?.forma === "letra" ? simbolo.letra ?? null : null,
          forma: simbolo && simbolo.forma !== "letra" ? FORMA_DESDE_SIMBOLO[simbolo.forma] ?? "circulo_relleno" : "circulo_relleno",
        };
      })
      .sort((a, b) => a.diente - b.diente);
  }, [historial, etiquetasEstado]);

  function usarSugerencia(s: (typeof sugerencias)[number]) {
    setColor(s.color);
    if (s.letra) {
      setAbreviatura(s.letra);
      setHerramienta("texto");
    } else {
      setSello(s.forma);
      setHerramienta("sello");
    }
    setDienteSugerido(s.diente);
  }

  const textosPorDiente = useMemo(() => {
    const mapa = new Map<number, { texto: string; color: string; indice: number }[]>();
    elementos.forEach((el, indice) => {
      if (el.t !== "texto") return;
      const lista = mapa.get(el.diente) ?? [];
      lista.push({ texto: el.texto, color: el.color, indice });
      mapa.set(el.diente, lista);
    });
    return mapa;
  }, [elementos]);

  function renderElemento(el: Elemento, indice: number, provisional = false) {
    const clickBorrar = provisional ? undefined : () => borrar(indice);
    const cursor = herramienta === "borrar" && !provisional ? "pointer" : undefined;
    if (el.t === "trazo") {
      const d = el.puntos.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
      return (
        <g key={indice} onPointerDown={clickBorrar} style={{ cursor }}>
          <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
          <path d={d} stroke={el.color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    }
    if (el.t === "linea") {
      return (
        <g key={indice} onPointerDown={clickBorrar} style={{ cursor }}>
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke="transparent" strokeWidth={12} />
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={2} strokeLinecap="round" />
        </g>
      );
    }
    if (el.t === "sello") {
      return (
        <g key={indice} onPointerDown={clickBorrar} style={{ cursor }}>
          <circle cx={el.x} cy={el.y} r={14} fill="transparent" />
          <Sello forma={el.forma} color={el.color} x={el.x} y={el.y} />
        </g>
      );
    }
    return null;
  }

  function columnaDiente(numero: number, col: number, arriba: boolean) {
    const x = colX(col);
    const cx = x + ANCHO_COL / 2;
    const caja = arriba ? CAJA_SUP : CAJA_INF;
    const textos = textosPorDiente.get(numero) ?? [];
    const resaltado = dienteSugerido === numero;
    return (
      <g key={numero}>
        {resaltado && (
          <rect x={x + 1} y={arriba ? 0 : LINEA_MEDIA_Y + 2} width={ANCHO_COL - 2} height={LINEA_MEDIA_Y - 2} rx={6} fill="#FFF3C4" />
        )}
        <rect x={x + 3} y={caja.y} width={ANCHO_COL - 6} height={caja.h} rx={2} fill="white" stroke="#9a9180" strokeWidth={0.8} />
        <text
          x={cx}
          y={caja.y + caja.h / 2 + 3.5}
          textAnchor="middle"
          fontSize={textos.length > 1 ? 7 : 9}
          fontWeight={700}
        >
          {textos.map((t, i) => (
            <tspan
              key={t.indice}
              fill={t.color}
              onPointerDown={herramienta === "borrar" ? () => borrar(t.indice) : undefined}
              style={{ cursor: herramienta === "borrar" ? "pointer" : undefined }}
            >
              {i > 0 ? " " : ""}
              {t.texto}
            </tspan>
          ))}
        </text>
        <text x={cx} y={arriba ? 34 : 240} textAnchor="middle" fontSize={8} fill="#8a8272" fontWeight={600}>
          {numero}
        </text>
        <svg
          x={cx - DIENTE_W / 2}
          y={arriba ? DIENTE_SUP_Y : DIENTE_INF_Y}
          width={DIENTE_W}
          height={DIENTE_H}
          style={{ fill: "white", stroke: "#5a5246", strokeWidth: 0.7 }}
        >
          <IconoDiente numero={numero} />
        </svg>
      </g>
    );
  }

  const botonesHerramienta: { h: Herramienta; label: string; icon: React.ReactNode }[] = [
    { h: "lapiz", label: "Lápiz", icon: <Pencil size={14} /> },
    { h: "linea", label: "Línea", icon: <Minus size={14} /> },
    { h: "sello", label: "Símbolo", icon: <Stamp size={14} /> },
    { h: "texto", label: "Abreviatura", icon: <Type size={14} /> },
    { h: "borrar", label: "Borrar", icon: <Eraser size={14} /> },
    { h: "mover", label: "Desplazar", icon: <Hand size={14} /> },
  ];

  return (
    <div className="mt-4 space-y-3">
      {/* Barra de herramientas */}
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex flex-wrap gap-1.5">
          {botonesHerramienta.map((b) => (
            <button
              key={b.h}
              onClick={() => setHerramienta(b.h)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium ${
                herramienta === b.h ? "bg-[#7C5CE0] text-white" : "bg-white/10 text-white/70"
              }`}
            >
              {b.icon} {b.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {COLORES.map((c) => (
            <button
              key={c.valor}
              onClick={() => setColor(c.valor)}
              aria-label={c.label}
              className={`h-7 w-7 rounded-full border-2 ${color === c.valor ? "border-white" : "border-transparent"}`}
              style={{ backgroundColor: c.valor }}
            />
          ))}
          <div className="ml-auto flex gap-1.5">
            <button
              onClick={deshacer}
              disabled={pila.length === 0}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[12px] text-white/80 disabled:opacity-40"
            >
              <Undo2 size={13} /> Deshacer
            </button>
            <button
              onClick={() => {
                if (elementos.length && window.confirm("¿Borrar todas las marcas de la carta?")) cambiar([]);
              }}
              disabled={elementos.length === 0}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[12px] text-white/80 disabled:opacity-40"
            >
              <Trash2 size={13} /> Limpiar
            </button>
          </div>
        </div>

        {herramienta === "sello" && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible">
            {SELLOS.map((s) => (
              <button
                key={s.forma}
                onClick={() => setSello(s.forma)}
                title={s.label}
                className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border px-1.5 py-0.5 text-[10px] ${
                  sello === s.forma ? "border-white bg-white text-[#2b2118]" : "border-white/15 bg-white/90 text-[#2b2118]/70"
                }`}
              >
                <MiniSello forma={s.forma} color={color} />
                <span className="pr-1">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {herramienta === "texto" && (
          <div className="flex flex-wrap gap-1.5">
            {ABREVIATURAS.map((a) => (
              <button
                key={a}
                onClick={() => setAbreviatura(a)}
                className={`rounded-lg px-2 py-1 text-[12px] font-bold ${
                  abreviatura === a ? "bg-white" : "bg-white/15"
                }`}
                style={{ color: abreviatura === a ? color : "rgba(255,255,255,0.8)" }}
              >
                {a}
              </button>
            ))}
          </div>
        )}

        <p className="text-[11px] text-white/40">
          {herramienta === "lapiz" && "Dibuja con el dedo o el mouse sobre los dientes."}
          {herramienta === "linea" && "Arrastra para trazar una línea recta."}
          {herramienta === "sello" && "Elige un símbolo y tócalo sobre el diente donde va."}
          {herramienta === "texto" && "Elige la abreviatura y toca el diente: se escribe en su recuadro."}
          {herramienta === "borrar" && "Toca una marca para quitarla."}
          {herramienta === "mover" && "Desliza para recorrer la carta sin dibujar."}
          {dienteSugerido !== null && ` · Colócalo en el diente ${dienteSugerido} (resaltado).`}
        </p>
      </div>

      {/* Sugerencias desde el odontograma 3D */}
      {sugerencias.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Condiciones ya registradas — toca para colocarlas
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sugerencias.map((s) => (
              <button
                key={s.diente}
                onClick={() => usarSugerencia(s)}
                className={`flex items-center gap-1.5 rounded-xl border bg-white/90 px-2 py-1 text-[11px] text-[#2b2118] ${
                  dienteSugerido === s.diente ? "border-[#F0C24E]" : "border-transparent"
                }`}
              >
                <span className="font-bold text-[#8a8272]">{s.diente}</span>
                {s.letra ? (
                  <span className="font-bold" style={{ color: s.color }}>
                    {s.letra}
                  </span>
                ) : (
                  <MiniSello forma={s.forma} color={s.color} />
                )}
                <span className="max-w-[140px] truncate">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Carta */}
      <div className="overflow-x-auto rounded-2xl bg-white p-2">
        {cargando ? (
          <p className="p-6 text-center text-sm text-[#8a8272]">Cargando…</p>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${ANCHO_TOTAL} ${ALTO_TOTAL}`}
            className="block w-full select-none"
            style={{ minWidth: 640, touchAction: herramienta === "mover" ? "pan-x pan-y" : "none" }}
            onPointerDown={alPresionar}
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={alSoltar}
          >
            <line
              x1={MARGEN}
              x2={ANCHO_TOTAL - MARGEN}
              y1={LINEA_MEDIA_Y}
              y2={LINEA_MEDIA_Y}
              stroke="#cfc6b4"
              strokeDasharray="4 3"
              strokeWidth={0.8}
            />
            <line
              x1={colX(8) - HUECO_LINEA_MEDIA / 2}
              x2={colX(8) - HUECO_LINEA_MEDIA / 2}
              y1={0}
              y2={ALTO_TOTAL}
              stroke="#cfc6b4"
              strokeWidth={0.8}
            />
            {ARCO_SUPERIOR.map((n, i) => columnaDiente(n, i, true))}
            {ARCO_INFERIOR_VISUAL.map((n, i) => columnaDiente(n, i, false))}
            {elementos.map((el, i) => renderElemento(el, i))}
            {actual && renderElemento(actual, -1, true)}
          </svg>
        )}
      </div>

      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <button
          onClick={guardar}
          disabled={!pendiente || guardando}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#7C5CE0] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          <Save size={14} /> {guardando ? "Guardando…" : pendiente ? "Guardar marcas" : "Sin cambios"}
        </button>
        {info && <span className="text-center text-[11px] text-white/40 sm:shrink-0 sm:text-left">{info}</span>}
      </div>
    </div>
  );
}

