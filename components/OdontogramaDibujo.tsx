"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { COLOCACION_DIENTES, ODONTOGRAMA_VERSION } from "@/lib/odontograma-version";
import { Eraser, Minus, Pencil, Save, Stamp, Type, Undo2, X, Trash2, Check, History, Stethoscope } from "lucide-react";
import { ARCO_SUPERIOR, ARCO_INFERIOR, SIMBOLO_DIENTE, type HistorialDental, type SimboloEstado } from "@/lib/dental";

// ---- Geometría de la carta (unidades del viewBox) ----
// El fondo es la carta dental anatómica de la doctora
// (public/odontograma-carta.jpg, 1024×787), igual que el recetario usa su
// membrete: así las piezas tienen exactamente la forma del odontograma
// en papel. Arriba y abajo se agrega una franja para el recuadro de
// abreviaturas de cada pieza.
const IMG_W = 1024;
const IMG_H = 787;
const FRANJA = 44;
const ANCHO_TOTAL = IMG_W;
const ALTO_TOTAL = IMG_H + FRANJA * 2;
// Bordes de columna medidos sobre la imagen (16 piezas por arcada).
const BORDES_COL = [0, 76, 151, 227, 284, 341, 397, 454, 511, 568, 625, 682, 739, 796, 872, 947, 1023];
const LINEA_MEDIA_Y = FRANJA + 401;
const CAJA_SUP = { y: 6, h: 32 };
const CAJA_INF = { y: FRANJA + IMG_H + 6, h: 32 };
// Escala de grosores/tamaños respecto a la carta anterior (642 de ancho).
const K = 1.6;

const ARCO_INFERIOR_VISUAL = [...ARCO_INFERIOR].reverse();

function colX(i: number) {
  return BORDES_COL[i];
}
function anchoCol(i: number) {
  return BORDES_COL[i + 1] - BORDES_COL[i];
}

function columnaDeX(x: number): number | null {
  for (let i = 0; i < 16; i++) {
    if (x >= BORDES_COL[i] && x < BORDES_COL[i + 1]) return i;
  }
  return null;
}

function dienteEn(x: number, y: number): number | null {
  const col = columnaDeX(x);
  if (col === null) return null;
  return y < LINEA_MEDIA_Y ? ARCO_SUPERIOR[col] : ARCO_INFERIOR_VISUAL[col];
}

// Carta con las ilustraciones realistas ya integradas en una sola imagen
// (se genera recortando public/dientes/N.webp sobre la carta original),
// para que cargue de una vez en lugar de imagen por imagen.
const CARTA_URL = `/odontograma-carta-v2.webp?v=${ODONTOGRAMA_VERSION}`;

// Dientes con ilustración realista propia (public/dientes/N.webp) que
// sustituye al dibujo de línea de la carta en su columna.
const DIENTES_REALISTAS = new Set<number>([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 38, 47, 37, 46, 36, 45, 35, 44, 34, 43, 33, 42, 32, 41, 31]);

// Lienzo propio de un diente realista en pantalla completa: las marcas
// de ese diente se guardan en estas coordenadas (con d = número) y en
// la carta completa se dibujan reducidas dentro de su columna.
const LIENZO_W = 300;
const LIENZO_CABECERA = 150;
const LIENZO_H = LIENZO_CABECERA + 1017 + 30;
// En la pantalla completa la ilustración se ve 5% más grande. En la carta
// completa cada diente ocupa el tamaño de su dibujo original. Debe coincidir con scripts/componer-carta.py.
const ESCALA_REAL = 1.05;
const IMG_REAL = { x: 30, y: LIENZO_CABECERA, w: 240, h: 1017 };

const HOY = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const esPasado = (el: { f?: string }) => el.f !== HOY;

// Transformación lienzo realista → carta completa de un diente (la
// misma que usa su columna para dibujar la miniatura).
function mapaColumna(numero: number) {
  let col = ARCO_SUPERIOR.indexOf(numero);
  const arriba = col !== -1;
  if (!arriba) col = ARCO_INFERIOR_VISUAL.indexOf(numero);
  if (col === -1) return null;
  const w = anchoCol(col);
  const cx = colX(col) + w / 2;
  const yIni = arriba ? FRANJA + 34 : LINEA_MEDIA_Y + 2;
  const alto = arriba ? LINEA_MEDIA_Y - FRANJA - 36 : FRANJA + IMG_H - 34 - LINEA_MEDIA_Y - 4;
  const c = COLOCACION_DIENTES[numero];
  const esc = c ? c[0] : Math.min((w - 2) / LIENZO_W, alto / (LIENZO_H - LIENZO_CABECERA));
  const ox = c ? c[1] : cx - (LIENZO_W * esc) / 2;
  const oy = c ? c[2] : yIni + (alto - (LIENZO_H - LIENZO_CABECERA) * esc) / 2 - LIENZO_CABECERA * esc;
  return { esc, ox, oy, x: colX(col), w, yIni, alto };
}

// Diente al que pertenece una marca hecha sobre la carta completa
// (por su punto central).
function dienteDeElemento(el: Elemento): number | null {
  if (el.t === "texto") return el.diente;
  let x: number, y: number;
  if (el.t === "sello") [x, y] = [el.x, el.y];
  else if (el.t === "linea") [x, y] = [(el.x1 + el.x2) / 2, (el.y1 + el.y2) / 2];
  else {
    const xs = el.puntos.map((p) => p[0]);
    const ys = el.puntos.map((p) => p[1]);
    [x, y] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  }
  return dienteEn(x, y);
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
  | "corona_cmp"
  | "corona_clm"
  | "corona_cac"
  | "sellante"
  | "tornillo"
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

type Elemento = (
  | { t: "trazo"; color: string; puntos: [number, number][] }
  | { t: "linea"; color: string; x1: number; y1: number; x2: number; y2: number }
  | { t: "sello"; color: string; forma: FormaSello; x: number; y: number; e?: number }
  | { t: "texto"; color: string; texto: string; diente: number }
) & {
  v?: number;
  d?: number;
  f?: string;
  // Significado de un trazo a mano (ej. "Resina") y diagnóstico del que
  // viene una marca puesta automáticamente.
  m?: string;
  est?: string;
};

// Tratamientos que se pintan a mano, con el color que marca la norma.
const TRATAMIENTOS_PINTADOS = [
  { clave: "Resina", color: "#2E9E5B" },
  { clave: "Amalgama", color: "#2F5DD0" },
  { clave: "Material temporal", color: "#D62839" },
  { clave: "Incrustación", color: "#2F5DD0" },
  { clave: "Puente (contorno)", color: "#2F5DD0" },
] as const;

// Las marcas guardadas antes de usar la carta en imagen (sin v=2) se
// pasan aproximadamente a las coordenadas nuevas.
function migrar(el: Elemento): Elemento {
  if (el.v === 2 || el.t === "texto") return { ...el, v: 2 };
  const mx = (x: number) => (x * IMG_W) / 642;
  const my = (y: number) => FRANJA + (y * IMG_H) / 268;
  if (el.t === "trazo") return { ...el, v: 2, puntos: el.puntos.map(([x, y]) => [mx(x), my(y)] as [number, number]) };
  if (el.t === "linea") return { ...el, v: 2, x1: mx(el.x1), y1: my(el.y1), x2: mx(el.x2), y2: my(el.y2) };
  return { ...el, v: 2, x: mx(el.x), y: my(el.y) };
}

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
  { forma: "tornillo", label: "Implante" },
  { forma: "corona_cmp", label: "Corona metal porcelana" },
  { forma: "corona_clm", label: "Corona libre de metal" },
  { forma: "corona_cac", label: "Corona acero cromado" },
  { forma: "sellante", label: "Sellante" },
];

// Abreviatura que, por convención, acompaña a un símbolo: al ponerlo en
// el diente se escribe sola en su recuadro.
const ABREVIATURA_DE_SELLO: Partial<Record<FormaSello, string>> = {
  doble_linea: "RR",
  tornillo: "IMP",
  corona_cmp: "CMP",
  corona_clm: "CLM",
  corona_cac: "CAC",
  linea_v: "TCC",
  triangulo: "TCC",
  circulo: "CC",
};

const ABREVIATURAS = [
  "S", "RR", "MAC", "MIC", "M1", "M2", "M3", "IMP",
  "ATR", "ABR", "ERS", "ABF", "TCC", "PC", "PP",
  "CT", "CC", "CPP", "CMA", "CMP", "CF", "C¾", "CP", "CR", "CM",
  "PMA", "PMP", "PM", "CLM", "CAC",
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
function Sello({ forma, color, x, y, escala = 1 }: { forma: FormaSello; color: string; x: number; y: number; escala?: number }) {
  const sw = 2;
  const p = { stroke: color, strokeWidth: sw, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const g = (children: React.ReactNode) => <g transform={`translate(${x},${y}) scale(${escala})`}>{children}</g>;
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
    case "corona_cmp":
    case "corona_clm":
    case "corona_cac":
      // Cuadrado incompleto sobre la cara vestibular y la lingual/palatina.
      return g(
        <>
          <path d="M-12,-7 L-12,-13 L12,-13 L12,-7" {...p} />
          <path d="M-12,7 L-12,13 L12,13 L12,7" {...p} />
        </>
      );
    case "sellante":
      return g(
        <text x={0} y={8} textAnchor="middle" fontSize={22} fontWeight={700} fontStyle="italic" fill={color} stroke="none">
          S
        </text>
      );
    case "tornillo":
      // Implante: cabeza, cuerpo con cuerdas y punta (un tornillo).
      return g(
        <>
          <line x1={-8} y1={-14} x2={8} y2={-14} {...p} />
          <path d="M-5,-14 L-5,3 L0,14 L5,3 L5,-14" {...p} />
          <line x1={-5} y1={-8} x2={5} y2={-6} {...p} />
          <line x1={-5} y1={-2} x2={5} y2={0} {...p} />
          <line x1={-4} y1={4} x2={4} y2={6} {...p} />
        </>
      );
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
  dienteFoco = null,
  onCambiarFoco,
  onRegistrarEstado,
  onCrearEstado,
}: {
  pacienteId: number;
  historial: HistorialDental;
  etiquetasEstado: Record<string, { label: string; ring?: string }>;
  // Registro del diagnóstico/tratamiento del diente (alimenta los colores
  // del odontograma 3D). Lo guarda quien contiene el historial.
  onRegistrarEstado?: (diente: number, r: { estado: string; tipo: string; nota: string | null }) => Promise<void>;
  // Crea un estado propio (ej. "Bruxismo") y regresa su clave.
  onCrearEstado?: (nombre: string) => Promise<string | null>;
  // Diente elegido desde el odontograma 3D/foto: la carta se acerca a
  // esa pieza para marcarla con precisión.
  dienteFoco?: number | null;
  onCambiarFoco?: (n: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [pila, setPila] = useState<Elemento[][]>([]);
  const [actual, setActual] = useState<Elemento | null>(null);
  const [herramienta, setHerramienta] = useState<Herramienta>("lapiz");
  const [color, setColor] = useState<string>(ROJO);
  const [sello, setSello] = useState<FormaSello>("circulo_relleno");
  // Símbolo recién puesto que todavía se puede arrastrar y cambiar de
  // tamaño; se fija con "Listo".
  const [editando, setEditando] = useState<number | null>(null);
  // Historial por consulta: en la carta completa se puede ver solo lo
  // marcado en una fecha ("antes" = marcas sin fecha registrada).
  // Tratamiento que se está pintando a mano ("Resina", etc.).
  const [significado, setSignificado] = useState<string | null>(null);
  const [filtroFecha, setFiltroFecha] = useState<string | null>(null);
  const arrastrando = useRef<{ dx: number; dy: number } | null>(null);
  const [abreviatura, setAbreviatura] = useState("S");
  const [dienteSugerido, setDienteSugerido] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pendiente, setPendiente] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Precarga las ilustraciones para que la pantalla completa abra al instante.
  useEffect(() => {
    DIENTES_REALISTAS.forEach((n) => {
      const img = new Image();
      img.src = `/dientes/${n}.webp?v=${ODONTOGRAMA_VERSION}`;
    });
  }, []);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/pacientes/${pacienteId}/odontograma-dibujo`)
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        setElementos((d.elementos ?? []).map(migrar));
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
    // Cada marca nueva lleva la fecha del día: las de visitas pasadas
    // se dibujan más tenues para distinguirlas de lo marcado hoy.
    const previos = new Set(elementos);
    setElementos(nuevos.map((el) => (previos.has(el) || el.f ? el : { ...el, f: HOY })));
    setPendiente(true);
  }

  function deshacer() {
    if (pila.length === 0) return;
    setEditando(null);
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

  function moverEditando(x: number, y: number) {
    setElementos((els) => els.map((el, i) => (i === editando && el.t === "sello" ? { ...el, x, y } : el)));
    setPendiente(true);
  }

  function tamanoEditando(delta: number) {
    if (editando === null) return;
    cambiar(
      elementos.map((el, i) =>
        i === editando && el.t === "sello" ? { ...el, e: Math.min(3, Math.max(0.4, Math.round(((el.e ?? 1) + delta) * 10) / 10)) } : el
      )
    );
  }

  const lienzo = dienteFoco != null && DIENTES_REALISTAS.has(dienteFoco) ? dienteFoco : null;
  const conD = <T extends Elemento>(el: T): T => {
    const marca = el.t === "trazo" || el.t === "linea" ? (significado ? { m: significado } : {}) : {};
    return lienzo != null ? { ...el, ...marca, d: lienzo } : { ...el, ...marca };
  };

  function alPresionar(e: ReactPointerEvent<SVGSVGElement>) {
    // Al marcar algo nuevo se vuelve a ver todo (lo nuevo es de hoy).
    if (filtroFecha !== null && filtroFecha !== HOY) setFiltroFecha(null);
    if (editando !== null) {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setPila((p) => [...p.slice(-49), elementos]);
      const [x, y] = punto(e);
      const el = elementos[editando];
      // Si se toca el símbolo, se arrastra desde ahí; si se toca en
      // otro lado, el símbolo salta a ese punto.
      const cerca = el?.t === "sello" && Math.hypot(el.x - x, el.y - y) < 24 * K * (el.e ?? 1);
      arrastrando.current = cerca && el?.t === "sello" ? { dx: el.x - x, dy: el.y - y } : { dx: 0, dy: 0 };
      if (!cerca) moverEditando(x, y);
      return;
    }
    if (herramienta === "mover" || herramienta === "borrar") return;
    const [x, y] = punto(e);
    if (herramienta === "lapiz") {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setActual(conD({ t: "trazo", color, puntos: [[x, y]], v: 2 }));
    } else if (herramienta === "linea") {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setActual(conD({ t: "linea", color, x1: x, y1: y, x2: x, y2: y, v: 2 }));
    } else if (herramienta === "sello") {
      const nuevos: Elemento[] = [...elementos, conD({ t: "sello", color, forma: sello, x, y, v: 2 })];
      const abrev = ABREVIATURA_DE_SELLO[sello];
      const dienteSello = lienzo ?? dienteEn(x, y);
      if (
        abrev &&
        dienteSello !== null &&
        !elementos.some((el) => el.t === "texto" && el.diente === dienteSello && el.texto === abrev)
      ) {
        nuevos.push({ t: "texto", color, texto: abrev, diente: dienteSello, v: 2 });
      }
      cambiar(nuevos);
      setEditando(elementos.length);
      setDienteSugerido(null);
    } else if (herramienta === "texto") {
      const diente = lienzo ?? dienteEn(x, y);
      if (diente !== null) {
        cambiar([...elementos, { t: "texto", color, texto: abreviatura, diente, v: 2 }]);
        setDienteSugerido(null);
      }
    }
  }

  function alMover(e: ReactPointerEvent<SVGSVGElement>) {
    if (arrastrando.current) {
      const [x, y] = punto(e);
      moverEditando(x + arrastrando.current.dx, y + arrastrando.current.dy);
      return;
    }
    if (!actual) return;
    const [x, y] = punto(e);
    if (actual.t === "trazo") {
      const ult = actual.puntos[actual.puntos.length - 1];
      if (Math.hypot(x - ult[0], y - ult[1]) < 2.5) return;
      setActual({ ...actual, puntos: [...actual.puntos, [x, y]] });
    } else if (actual.t === "linea") {
      setActual({ ...actual, x2: x, y2: y });
    }
  }

  function alSoltar() {
    arrastrando.current = null;
    if (!actual) return;
    const valido =
      (actual.t === "trazo" && actual.puntos.length > 1) ||
      (actual.t === "linea" && Math.hypot(actual.x2 - actual.x1, actual.y2 - actual.y1) > 5);
    if (valido) cambiar([...elementos, actual]);
    setActual(null);
  }

  function borrar(indice: number) {
    if (herramienta !== "borrar" || dienteFoco == null) return;
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
          forma: d.estado.startsWith("implante")
            ? "tornillo"
            : simbolo && simbolo.forma !== "letra"
              ? FORMA_DESDE_SIMBOLO[simbolo.forma] ?? "circulo_relleno"
              : "circulo_relleno",
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

  // Al elegir un diagnóstico/tratamiento: el color y el símbolo se ponen
  // solos según la convención (rojo = mal estado/por tratar, azul = bien).
  function aplicarEstado(clave: string) {
    setColor(ESTADOS_ROJOS.has(clave) ? ROJO : AZUL);
    const simbolo = (SIMBOLO_DIENTE as Record<string, SimboloEstado>)[clave];
    if (simbolo?.forma === "letra" && simbolo.letra) {
      setAbreviatura(simbolo.letra);
      setHerramienta("texto");
    } else if (clave.startsWith("implante")) {
      setSello("tornillo");
      setHerramienta("sello");
    } else if (simbolo && simbolo.forma !== "ninguno") {
      setSello(FORMA_DESDE_SIMBOLO[simbolo.forma] ?? "circulo_relleno");
      setHerramienta("sello");
    }
  }

  // Todo diagnóstico queda dibujado en el diente con su símbolo (o su
  // abreviatura en el recuadro), listo para acomodarlo y fijarlo con
  // "Listo". Si ya se había puesto el de ese diagnóstico, no se repite.
  function colocarMarcaDeEstado(clave: string, diente: number) {
    if (clave === "sano") return;
    if (elementos.some((el) => el.est === clave && (el.t === "texto" ? el.diente === diente : el.d === diente || dienteDeElemento(el) === diente))) return;
    const simbolo = (SIMBOLO_DIENTE as Record<string, SimboloEstado>)[clave];
    const col = ESTADOS_ROJOS.has(clave) ? ROJO : AZUL;
    if (simbolo?.forma === "letra" && simbolo.letra) {
      cambiar([...elementos, { t: "texto", color: col, texto: simbolo.letra, diente, v: 2, est: clave }]);
      return;
    }
    if (!simbolo || simbolo.forma === "ninguno") return;
    const forma: FormaSello = clave.startsWith("implante") ? "tornillo" : FORMA_DESDE_SIMBOLO[simbolo.forma] ?? "circulo_relleno";
    let x: number, y: number;
    const real = DIENTES_REALISTAS.has(diente);
    if (real) {
      [x, y] = [IMG_REAL.x + IMG_REAL.w / 2, IMG_REAL.y + IMG_REAL.h * 0.5];
    } else {
      const arriba = ARCO_SUPERIOR.includes(diente);
      const c = arriba ? ARCO_SUPERIOR.indexOf(diente) : ARCO_INFERIOR_VISUAL.indexOf(diente);
      [x, y] = [colX(c) + anchoCol(c) / 2, arriba ? FRANJA + 200 : LINEA_MEDIA_Y + 200];
    }
    const nuevo: Elemento = { t: "sello", color: col, forma, x, y, v: 2, est: clave, ...(real ? { d: diente } : {}) };
    cambiar([...elementos, nuevo]);
    setEditando(elementos.length);
  }

  // Al llegar desde el 3D con un diente elegido: se resalta y, si ya
  // tiene una condición registrada, se deja listo su símbolo/color.
  useEffect(() => {
    if (dienteFoco == null) return;
    const s = sugerencias.find((x) => x.diente === dienteFoco);
    if (s) usarSugerencia(s);
    else setDienteSugerido(dienteFoco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dienteFoco]);

  const vistaCaja = useMemo(() => {
    if (dienteFoco == null) return `0 0 ${ANCHO_TOTAL} ${ALTO_TOTAL}`;
    const iSup = ARCO_SUPERIOR.indexOf(dienteFoco);
    const arriba = iSup !== -1;
    const col = arriba ? iSup : ARCO_INFERIOR_VISUAL.indexOf(dienteFoco);
    if (col === -1) return `0 0 ${ANCHO_TOTAL} ${ALTO_TOTAL}`;
    const x0 = colX(col);
    const ancho = anchoCol(col);
    const y0 = arriba ? 0 : LINEA_MEDIA_Y - 6;
    const alto = arriba ? LINEA_MEDIA_Y + 6 : ALTO_TOTAL - y0;
    return `${x0} ${y0} ${ancho} ${alto}`;
  }, [dienteFoco]);

  const filtrando = filtroFecha !== null;
  const visible = (el: Elemento) => !filtrando || (el.f ?? "antes") === filtroFecha;

  const textosPorDiente = useMemo(() => {
    const mapa = new Map<number, { texto: string; color: string; indice: number; pasado: boolean }[]>();
    elementos.forEach((el, indice) => {
      if (el.t !== "texto" || !visible(el)) return;
      const lista = mapa.get(el.diente) ?? [];
      lista.push({ texto: el.texto, color: el.color, indice, pasado: !filtrando && esPasado(el) });
      mapa.set(el.diente, lista);
    });
    return mapa;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementos, filtrando, filtroFecha]);

  const fechas = useMemo(() => {
    const set = new Set(elementos.map((el) => el.f ?? "antes"));
    return Array.from(set).sort((a, b) => (a === "antes" ? -1 : b === "antes" ? 1 : b.localeCompare(a)));
  }, [elementos]);

  const etiquetaFecha = (f: string) =>
    f === "antes"
      ? "Anteriores"
      : f === HOY
        ? "Hoy"
        : new Date(`${f}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

  function renderElemento(el: Elemento, indice: number, provisional = false) {
    if (!provisional && !visible(el)) return null;
    if (provisional || filtrando || !esPasado(el)) return renderElementoBase(el, indice, provisional);
    return (
      <g key={indice} opacity={0.38}>
        {renderElementoBase(el, indice, provisional)}
      </g>
    );
  }

  function renderElementoBase(el: Elemento, indice: number, provisional = false) {
    const clickBorrar = provisional ? undefined : () => borrar(indice);
    const cursor = herramienta === "borrar" && !provisional ? "pointer" : undefined;
    if (el.t === "trazo") {
      const d = el.puntos.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
      return (
        <g key={indice} onPointerDown={clickBorrar} style={{ cursor }}>
          <path d={d} stroke="transparent" strokeWidth={20} fill="none" />
          <path d={d} stroke={el.color} strokeWidth={2 * K} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    }
    if (el.t === "linea") {
      return (
        <g key={indice} onPointerDown={clickBorrar} style={{ cursor }}>
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke="transparent" strokeWidth={20} />
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={2 * K} strokeLinecap="round" />
        </g>
      );
    }
    if (el.t === "sello") {
      return (
        <g key={indice} onPointerDown={clickBorrar} style={{ cursor }}>
          <circle cx={el.x} cy={el.y} r={14 * K * (el.e ?? 1)} fill="transparent" />
          {indice === editando && (
            <circle
              cx={el.x}
              cy={el.y}
              r={17 * K * (el.e ?? 1)}
              fill="#F0C24E"
              fillOpacity={0.12}
              stroke="#E0A800"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          )}
          <Sello forma={el.forma} color={el.color} x={el.x} y={el.y} escala={K * (el.e ?? 1)} />
        </g>
      );
    }
    return null;
  }

  function columnaDiente(numero: number, col: number, arriba: boolean) {
    const x = colX(col);
    const w = anchoCol(col);
    const cx = x + w / 2;
    const caja = arriba ? CAJA_SUP : CAJA_INF;
    const textos = textosPorDiente.get(numero) ?? [];
    const resaltado = dienteSugerido === numero;
    const realista = DIENTES_REALISTAS.has(numero);
    return (
      <g key={numero}>
        {realista &&
          (() => {
            const { esc, ox, oy } = mapaColumna(numero)!;
            return (
              <>
                {/* La ilustración ya viene integrada en la carta (una sola imagen). */}
                <g transform={`translate(${ox},${oy}) scale(${esc})`}>
                  {elementos.map((el, i) => (el.d === numero ? renderElemento(el, i) : null))}
                </g>
              </>
            );
          })()}
        {resaltado && (
          <rect
            x={x + 2}
            y={arriba ? FRANJA + 34 : LINEA_MEDIA_Y + 2}
            width={w - 4}
            height={arriba ? LINEA_MEDIA_Y - FRANJA - 36 : FRANJA + IMG_H - 34 - LINEA_MEDIA_Y - 4}
            rx={8}
            fill="#F0C24E"
            fillOpacity={0.28}
          />
        )}
        <rect x={x + 4} y={caja.y} width={w - 8} height={caja.h} rx={3} fill="white" stroke="#9a9180" strokeWidth={1.2} />
        <text x={cx} y={caja.y + caja.h / 2 + 6} textAnchor="middle" fontSize={textos.length > 1 ? 12 : 16} fontWeight={700}>
          {textos.map((t, i) => (
            <tspan
              key={t.indice}
              fill={t.color}
              fillOpacity={t.pasado ? 0.4 : 1}
              onPointerDown={herramienta === "borrar" ? () => borrar(t.indice) : undefined}
              style={{ cursor: herramienta === "borrar" ? "pointer" : undefined }}
            >
              {i > 0 ? " " : ""}
              {t.texto}
            </tspan>
          ))}
        </text>
      </g>
    );
  }


  const carta = (
<svg
  ref={svgRef}
  viewBox={vistaCaja}
  preserveAspectRatio="xMidYMid meet"
  className={`block select-none ${dienteFoco != null ? "h-full w-full" : "w-full"}`}
  style={
    dienteFoco != null
      ? { overflow: "hidden", touchAction: "none" }
      : { minWidth: 700, touchAction: "pan-x pan-y", cursor: "pointer" }
  }
  onPointerDown={dienteFoco != null ? alPresionar : undefined}
  onPointerMove={dienteFoco != null ? alMover : undefined}
  onPointerUp={dienteFoco != null ? alSoltar : undefined}
  onPointerCancel={dienteFoco != null ? alSoltar : undefined}
  onClick={
    dienteFoco != null
      ? undefined
      : (e) => {
          const [x, y] = punto(e as unknown as ReactPointerEvent<SVGSVGElement>);
          const n = dienteEn(x, y);
          if (n != null) onCambiarFoco?.(n);
        }
  }
>
  <defs>
    <clipPath id="recorte-diente">
      {(() => {
        const [x, y, w, h] = vistaCaja.split(" ").map(Number);
        return <rect x={x} y={y} width={w} height={h} />;
      })()}
    </clipPath>
  </defs>
  <g clipPath={dienteFoco != null ? "url(#recorte-diente)" : undefined}>
    <image href={CARTA_URL} x={0} y={FRANJA} width={IMG_W} height={IMG_H} preserveAspectRatio="none" />
    {ARCO_SUPERIOR.map((n, i) => columnaDiente(n, i, true))}
    {ARCO_INFERIOR_VISUAL.map((n, i) => columnaDiente(n, i, false))}
    {elementos.map((el, i) => (el.d == null ? renderElemento(el, i) : null))}
    {actual && renderElemento(actual, -1, true)}
  </g>
</svg>
  );

  // Pantalla completa de un diente con ilustración realista: lienzo
  // propio, más amplio, con su recuadro de abreviaturas y su número.
  const lienzoSvg = lienzo != null && (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${LIENZO_W} ${LIENZO_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full select-none"
      style={{ touchAction: "none" }}
      onPointerDown={alPresionar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
    >
      <rect x={0} y={0} width={LIENZO_W} height={LIENZO_H} fill="white" />
      <image
        href={`/dientes/${lienzo}.webp?v=${ODONTOGRAMA_VERSION}`}
        x={IMG_REAL.x - (IMG_REAL.w * (ESCALA_REAL - 1)) / 2}
        y={IMG_REAL.y - (IMG_REAL.h * (ESCALA_REAL - 1)) / 2}
        width={IMG_REAL.w * ESCALA_REAL}
        height={IMG_REAL.h * ESCALA_REAL}
      />
      <rect x={60} y={14} width={180} height={64} rx={14} fill="#FBF8F1" stroke="#CFC6B4" strokeWidth={2} />
      <text x={150} y={58} textAnchor="middle" fontSize={(textosPorDiente.get(lienzo)?.length ?? 0) > 1 ? 24 : 32} fontWeight={700} fontFamily="Georgia, serif" fontStyle="italic">
        {(textosPorDiente.get(lienzo) ?? []).map((t, i) => (
          <tspan
            key={t.indice}
            fill={t.color}
            fillOpacity={t.pasado ? 0.4 : 1}
            onPointerDown={herramienta === "borrar" ? () => borrar(t.indice) : undefined}
          >
            {i > 0 ? " " : ""}
            {t.texto}
          </tspan>
        ))}
      </text>
      <rect x={112} y={92} width={76} height={40} rx={20} fill="#2b2118" />
      <text x={150} y={120} textAnchor="middle" fontSize={24} fontWeight={700} fill="white">
        {lienzo}
      </text>
      {(() => {
        const m = mapaColumna(lienzo);
        if (!m) return null;
        return (
          <g transform={`scale(${1 / m.esc}) translate(${-m.ox},${-m.oy})`}>
            {elementos.map((el, i) => (el.d == null && el.t !== "texto" && dienteDeElemento(el) === lienzo ? renderElemento(el, i) : null))}
          </g>
        );
      })()}
      {elementos.map((el, i) => (el.d === lienzo ? renderElemento(el, i) : null))}
      {actual && renderElemento(actual, -1, true)}
    </svg>
  );

  if (dienteFoco != null) {
    return (
      <PantallaCompleta
        diente={dienteFoco}
        carta={cargando ? <p className="p-6 text-center text-sm text-[#8a8272]">Cargando…</p> : lienzoSvg || carta}
        herramienta={herramienta}
        setHerramienta={(h) => {
          setEditando(null);
          setHerramienta(h);
        }}
        color={color}
        setColor={setColor}
        sello={sello}
        setSello={setSello}
        abreviatura={abreviatura}
        setAbreviatura={setAbreviatura}
        puedeDeshacer={pila.length > 0}
        deshacer={deshacer}
        pendiente={pendiente}
        guardando={guardando}
        guardar={guardar}
        sugerencia={sugerencias.find((x) => x.diente === dienteFoco)?.label ?? null}
        usarSugerencia={() => {
          const sg = sugerencias.find((x) => x.diente === dienteFoco);
          if (sg) usarSugerencia(sg);
        }}
        estados={Object.entries(etiquetasEstado).map(([key, v]) => ({ key, label: v.label, ring: v.ring ?? "#9aa" }))}
        estadoActual={dienteFoco != null ? historial[dienteFoco]?.estado ?? "sano" : "sano"}
        puedeRegistrar={!!onRegistrarEstado}
        crearEstado={onCrearEstado}
        elegirEstado={aplicarEstado}
        registrarEstado={async (estado, tipo, nota) => {
          if (dienteFoco == null) return;
          await onRegistrarEstado?.(dienteFoco, { estado, tipo, nota });
          colocarMarcaDeEstado(estado, dienteFoco);
        }}
        significado={significado}
        pintarTratamiento={(clave) => {
          const t = TRATAMIENTOS_PINTADOS.find((x) => x.clave === clave);
          if (!t) {
            setSignificado(null);
            return;
          }
          setColor(t.color);
          setHerramienta("lapiz");
          setSignificado(clave);
        }}
        resumenMarcas={(() => {
          const cuenta = new Map<string, number>();
          elementos.forEach((el) => {
            const delDiente = el.d === dienteFoco || (el.d == null && dienteDeElemento(el) === dienteFoco);
            if (delDiente && el.m) cuenta.set(el.m, (cuenta.get(el.m) ?? 0) + 1);
          });
          return Array.from(cuenta.entries());
        })()}
        fechas={(() => {
          const set = new Set(
            elementos
              .filter((el) => el.d === dienteFoco || (el.d == null && dienteDeElemento(el) === dienteFoco))
              .map((el) => el.f ?? "antes")
          );
          return fechas.filter((f) => set.has(f));
        })()}
        etiquetaFecha={etiquetaFecha}
        filtroFecha={filtroFecha}
        setFiltroFecha={setFiltroFecha}
        editandoSello={editando !== null}
        tamanoSello={tamanoEditando}
        fijarSello={() => setEditando(null)}
        quitarSello={() => {
          if (editando === null) return;
          cambiar(elementos.filter((_, i) => i !== editando));
          setEditando(null);
        }}
        cerrar={() => {
          setEditando(null);
          setFiltroFecha(null);
          setSignificado(null);
          if (pendiente) guardar();
          onCambiarFoco?.(null);
          setDienteSugerido(null);
        }}
      />
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-[12px] text-white/50">
        Toca un diente de la carta para abrirlo en pantalla completa y marcarlo.
      </p>

      {fechas.length > 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <span className="shrink-0 self-center text-[11px] font-semibold uppercase tracking-wide text-white/40">Consulta</span>
          {[null, ...fechas].map((f) => (
            <button
              key={f ?? "todas"}
              onClick={() => setFiltroFecha(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${
                filtroFecha === f ? "bg-[#7C5CE0] text-white" : "bg-white/10 text-white/70"
              }`}
            >
              {f === null ? "Todas" : etiquetaFecha(f)}
            </button>
          ))}
        </div>
      )}

      {/* Carta */}
      {dienteFoco != null && (
        <div className="flex items-center justify-between rounded-2xl border border-[#F0C24E]/40 bg-[#F0C24E]/10 px-3 py-2">
          <span className="text-[12px] font-semibold text-[#F0C24E]">Diente {dienteFoco} — acercado para marcar</span>
          <button
            onClick={() => {
              onCambiarFoco?.(null);
              setDienteSugerido(null);
            }}
            className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white"
          >
            Ver carta completa
          </button>
        </div>
      )}
      <div className="relative">
      <div className="overflow-x-auto rounded-2xl bg-white p-2">
        {cargando ? (
          <p className="p-6 text-center text-sm text-[#8a8272]">Cargando…</p>
        ) : (
          carta
        )}
      </div>
      </div>

      {info && <p className="text-center text-[11px] text-white/40">{info}</p>}
    </div>
  );
}



// Modo pantalla completa al venir de un diente del 3D: el diente ocupa
// casi toda la pantalla y las herramientas quedan en un riel al lado,
// a un toque del dedo. Las abreviaturas se eligen de chips grandes o se
// escriben libres.
function PantallaCompleta(props: {
  diente: number;
  carta: React.ReactNode;
  herramienta: Herramienta;
  setHerramienta: (h: Herramienta) => void;
  color: string;
  setColor: (c: string) => void;
  sello: FormaSello;
  setSello: (f: FormaSello) => void;
  abreviatura: string;
  setAbreviatura: (a: string) => void;
  puedeDeshacer: boolean;
  deshacer: () => void;
  pendiente: boolean;
  guardando: boolean;
  guardar: () => void;
  sugerencia: string | null;
  usarSugerencia: () => void;
  editandoSello: boolean;
  tamanoSello: (delta: number) => void;
  fijarSello: () => void;
  quitarSello: () => void;
  significado: string | null;
  pintarTratamiento: (clave: string | null) => void;
  resumenMarcas: [string, number][];
  estados: { key: string; label: string; ring: string }[];
  estadoActual: string;
  puedeRegistrar: boolean;
  crearEstado?: (nombre: string) => Promise<string | null>;
  elegirEstado: (clave: string) => void;
  registrarEstado: (estado: string, tipo: string, nota: string | null) => Promise<void>;
  fechas: string[];
  etiquetaFecha: (f: string) => string;
  filtroFecha: string | null;
  setFiltroFecha: (f: string | null) => void;
  cerrar: () => void;
}) {
  const { herramienta, setHerramienta, color } = props;
  const [panel, setPanel] = useState(false);
  const [libre, setLibre] = useState("");
  const [historial, setHistorial] = useState(false);
  const [estadoPanel, setEstadoPanel] = useState(false);
  const [estadoSel, setEstadoSel] = useState<string | null>(null);
  const [tipoTrat, setTipoTrat] = useState("");
  const [notaTrat, setNotaTrat] = useState("");
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [avisoEstado, setAvisoEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [creandoEstado, setCreandoEstado] = useState(false);
  const etiquetaActual = props.estados.find((e) => e.key === props.estadoActual)?.label;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function elegir(h: Herramienta) {
    if (h === herramienta && (h === "sello" || h === "texto")) setPanel((v) => !v);
    else setPanel(true);
    setHerramienta(h);
  }

  const riel: { h: Herramienta; label: string; icon: React.ReactNode }[] = [
    { h: "lapiz", label: "Lápiz", icon: <Pencil size={20} /> },
    { h: "linea", label: "Línea", icon: <Minus size={20} /> },
    { h: "sello", label: "Símbolo", icon: <Stamp size={20} /> },
    { h: "texto", label: "Abrev.", icon: <Type size={20} /> },
    { h: "borrar", label: "Borrar", icon: <Eraser size={20} /> },
  ];

  const mostrarPanel = panel && !props.editandoSello && (herramienta === "sello" || herramienta === "texto");

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-[#15101f]"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={props.cerrar} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-[13px] font-semibold text-white">
          <X size={16} /> Cerrar
        </button>
        <div className="flex-1 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Marcando</div>
          <div className="text-[17px] font-bold text-[#F0C24E]">Diente {props.diente}</div>
          {props.puedeRegistrar && etiquetaActual && props.estadoActual !== "sano" && (
            <div className="text-[11px] text-white/60">{etiquetaActual}</div>
          )}
        </div>
        <button
          onClick={props.guardar}
          disabled={!props.pendiente || props.guardando}
          className="flex items-center gap-1 rounded-full bg-[#7C5CE0] px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          <Save size={15} /> {props.guardando ? "…" : props.pendiente ? "Guardar" : "Guardado"}
        </button>
      </div>

      {props.sugerencia && (
        <button
          onClick={props.usarSugerencia}
          className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-2xl border border-[#F0C24E]/40 bg-[#F0C24E]/10 px-3 py-2 text-[12px] text-[#F0C24E]"
        >
          Registrado en 3D: <span className="font-bold">{props.sugerencia}</span> — toca el diente para colocarlo
        </button>
      )}

      <div className="flex min-h-0 flex-1 gap-2 px-3 pb-3">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-3xl bg-white p-2">
          {props.carta}

          {mostrarPanel && (
            <div className="absolute inset-x-2 bottom-2 max-h-[45%] overflow-y-auto rounded-2xl border border-white/10 bg-[#211a2e]/95 p-3 shadow-2xl backdrop-blur">
              {herramienta === "sello" ? (
                <div className="grid grid-cols-3 gap-2">
                  {SELLOS.map((s) => (
                    <button
                      key={s.forma}
                      onClick={() => {
                        props.setSello(s.forma);
                        setPanel(false);
                      }}
                      className={`flex flex-col items-center gap-1 rounded-xl p-2 text-[10px] leading-tight ${
                        props.sello === s.forma ? "bg-white text-[#2b2118] ring-2 ring-[#F0C24E]" : "bg-white/90 text-[#2b2118]/70"
                      }`}
                    >
                      <MiniSello forma={s.forma} color={color} />
                      <span className="text-center">{s.label}</span>
                      {ABREVIATURA_DE_SELLO[s.forma] && (
                        <span className="font-serif text-[11px] font-bold italic" style={{ color }}>
                          + {ABREVIATURA_DE_SELLO[s.forma]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {ABREVIATURAS.map((a) => (
                      <button
                        key={a}
                        onClick={() => {
                          props.setAbreviatura(a);
                          setPanel(false);
                        }}
                        className={`rounded-xl py-2.5 font-serif text-[18px] font-bold italic tracking-wide shadow-sm ${
                          props.abreviatura === a ? "bg-white ring-2 ring-[#F0C24E]" : "bg-white/90"
                        }`}
                        style={{ color }}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const t = libre.trim().toUpperCase();
                      if (!t) return;
                      props.setAbreviatura(t.slice(0, 6));
                      setLibre("");
                      setPanel(false);
                    }}
                  >
                    <input
                      value={libre}
                      onChange={(e) => setLibre(e.target.value)}
                      maxLength={6}
                      placeholder="Escribir otra…"
                      className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 font-serif text-[16px] font-bold italic uppercase outline-none"
                      style={{ color }}
                    />
                    <button className="rounded-xl bg-[#7C5CE0] px-4 text-[13px] font-semibold text-white">Usar</button>
                  </form>
                </div>
              )}
            </div>
          )}

          {estadoPanel && (
            <div className="absolute inset-x-2 top-2 z-20 max-h-[88%] overflow-y-auto rounded-2xl border border-white/10 bg-[#211a2e]/95 p-3 shadow-2xl backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
                  Diagnóstico / tratamiento · diente {props.diente}
                </span>
                <button onClick={() => setEstadoPanel(false)} aria-label="Cerrar" className="text-white/60">
                  <X size={16} />
                </button>
              </div>
              <div className="mb-3">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">Pintar a mano</div>
                <div className="flex flex-wrap gap-1.5">
                  {TRATAMIENTOS_PINTADOS.map((t) => (
                    <button
                      key={t.clave}
                      type="button"
                      onClick={() => {
                        props.pintarTratamiento(t.clave);
                        setEstadoPanel(false);
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white/85"
                    >
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.clave}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">Diagnóstico</div>
              <div className="grid grid-cols-2 gap-1.5">
                {props.estados.map((e) => (
                  <button
                    key={e.key}
                    type="button"
                    onClick={() => {
                      setEstadoSel(e.key);
                      props.elegirEstado(e.key);
                    }}
                    className={`flex items-center gap-1.5 rounded-xl border px-2 py-2 text-left text-[11px] leading-tight ${
                      (estadoSel ?? props.estadoActual) === e.key ? "border-white/70 bg-white/15 text-white" : "border-white/10 text-white/75"
                    }`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full border border-white/30" style={{ backgroundColor: e.ring }} />
                    <span>{e.label}</span>
                  </button>
                ))}
              </div>
              {props.crearEstado && (
                <div className="mt-2 flex gap-1.5">
                  <input
                    value={nuevoEstado}
                    onChange={(ev) => setNuevoEstado(ev.target.value)}
                    placeholder="¿No está? Crea un estado (ej. Bruxismo)"
                    className="min-w-0 flex-1 rounded-xl border border-white/15 bg-transparent px-3 py-2 text-[13px] text-white placeholder:text-white/30 outline-none"
                  />
                  <button
                    disabled={!nuevoEstado.trim() || creandoEstado}
                    onClick={async () => {
                      setCreandoEstado(true);
                      try {
                        const clave = await props.crearEstado!(nuevoEstado);
                        if (clave) {
                          setEstadoSel(clave);
                          setNuevoEstado("");
                        }
                      } finally {
                        setCreandoEstado(false);
                      }
                    }}
                    className="shrink-0 rounded-xl bg-white/15 px-3 text-[12px] font-semibold text-white disabled:opacity-40"
                  >
                    {creandoEstado ? "…" : "Crear"}
                  </button>
                </div>
              )}
              <input
                value={tipoTrat}
                onChange={(ev) => setTipoTrat(ev.target.value)}
                placeholder="Tipo de tratamiento (ej. Resina) — opcional"
                className="mt-3 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
              />
              <textarea
                value={notaTrat}
                onChange={(ev) => setNotaTrat(ev.target.value)}
                placeholder="Nota (opcional)"
                rows={2}
                className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
              />
              <button
                disabled={!estadoSel || guardandoEstado}
                onClick={async () => {
                  if (!estadoSel) return;
                  setGuardandoEstado(true);
                  const lab = props.estados.find((e) => e.key === estadoSel)?.label ?? estadoSel;
                  try {
                    await props.registrarEstado(estadoSel, tipoTrat.trim() || lab, notaTrat.trim() || null);
                    setTipoTrat("");
                    setNotaTrat("");
                    setEstadoSel(null);
                    setEstadoPanel(false);
                    setAvisoEstado(true);
                    setTimeout(() => setAvisoEstado(false), 1800);
                  } finally {
                    setGuardandoEstado(false);
                  }
                }}
                className="mt-3 w-full rounded-full bg-[#7C5CE0] py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
              >
                {guardandoEstado ? "Guardando…" : "Guardar diagnóstico"}
              </button>
              <p className="mt-2 text-[11px] leading-snug text-white/40">
                Al elegirlo, el color y el símbolo del pincel se ponen solos. El color del diente en el odontograma 3D cambia con este diagnóstico.
              </p>
            </div>
          )}

          {props.significado && !estadoPanel && (
            <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-2 rounded-2xl bg-[#2b2118]/90 px-3 py-2 text-white shadow-lg">
              <span className="text-[12px]">
                Pintando: <b>{props.significado}</b>
              </span>
              <button onClick={() => props.pintarTratamiento(null)} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
                Pincel libre
              </button>
            </div>
          )}

          {avisoEstado && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center">
              <span className="rounded-full bg-[#2E9E5B] px-4 py-1.5 text-[13px] font-semibold text-white shadow-lg">Diagnóstico guardado ✓</span>
            </div>
          )}

          {historial && (
            <div className="absolute inset-x-2 top-2 z-20 rounded-2xl border border-white/10 bg-[#211a2e]/95 p-3 shadow-2xl backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Historial del diente {props.diente}</span>
                <button onClick={() => setHistorial(false)} aria-label="Cerrar historial" className="text-white/60">
                  <X size={16} />
                </button>
              </div>
              {props.fechas.length === 0 ? (
                <p className="text-[12px] text-white/50">Este diente aún no tiene marcas.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {[null, ...props.fechas].map((f) => (
                    <button
                      key={f ?? "todas"}
                      onClick={() => props.setFiltroFecha(f)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                        props.filtroFecha === f ? "bg-[#7C5CE0] text-white" : "bg-white/10 text-white/70"
                      }`}
                    >
                      {f === null ? "Todas" : props.etiquetaFecha(f)}
                    </button>
                  ))}
                </div>
              )}
              {props.resumenMarcas.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {props.resumenMarcas.map(([m, n]) => (
                    <span key={m} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80">
                      {m} ×{n}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] leading-snug text-white/40">
                Elige una consulta para ver solo lo marcado ese día. Lo de visitas pasadas se ve tenue en &quot;Todas&quot;.
              </p>
            </div>
          )}

          {props.editandoSello && (
            <div className="absolute inset-x-2 bottom-2 z-10 flex items-center gap-2 rounded-2xl bg-[#211a2e]/95 p-2 shadow-2xl backdrop-blur">
              <button
                onClick={props.quitarSello}
                aria-label="Quitar símbolo"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white/80"
              >
                <Trash2 size={18} />
              </button>
              <div className="flex items-center rounded-xl bg-white/10">
                <button onClick={() => props.tamanoSello(-0.2)} aria-label="Más chico" className="h-11 w-11 text-[22px] font-bold text-white">
                  −
                </button>
                <span className="px-1 text-[10px] uppercase tracking-wide text-white/50">Tamaño</span>
                <button onClick={() => props.tamanoSello(0.2)} aria-label="Más grande" className="h-11 w-11 text-[22px] font-bold text-white">
                  +
                </button>
              </div>
              <button
                onClick={props.fijarSello}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2E9E5B] text-[14px] font-semibold text-white"
              >
                <Check size={18} /> Listo
              </button>
            </div>
          )}

          {props.editandoSello && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[72px] flex justify-center">
              <span className="rounded-full bg-[#2b2118]/85 px-3 py-1 text-[12px] text-white">Arrastra el símbolo para acomodarlo</span>
            </div>
          )}

          {(herramienta === "sello" || herramienta === "texto") && !mostrarPanel && !props.editandoSello && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-[#2b2118]/85 px-3 py-1 text-[12px] text-white">
                Toca el diente para poner
                {herramienta === "sello" ? (
                  <MiniSello forma={props.sello} color={color} />
                ) : (
                  <b className="font-serif italic" style={{ color }}>{props.abreviatura}</b>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="flex w-[60px] shrink-0 flex-col items-center gap-1.5 overflow-y-auto rounded-3xl bg-white/5 py-2">
          <button
            onClick={props.deshacer}
            disabled={!props.puedeDeshacer}
            className="flex w-[50px] flex-col items-center gap-0.5 rounded-2xl bg-white py-2 text-[8px] font-semibold text-[#2b2118] active:scale-95 disabled:opacity-30"
          >
            <Undo2 size={20} /> Deshacer
          </button>
          {props.puedeRegistrar && (
            <button
              onClick={() => {
                setEstadoPanel((v) => !v);
                setHistorial(false);
              }}
              className={`flex w-[50px] flex-col items-center gap-0.5 rounded-2xl py-2 text-[8px] font-semibold ${
                estadoPanel ? "bg-[#F0C24E] text-[#2b2118]" : "bg-[#7C5CE0] text-white"
              }`}
            >
              <Stethoscope size={20} /> Estado
            </button>
          )}
          <button
            onClick={() => {
              setHistorial((v) => !v);
              setEstadoPanel(false);
            }}
            className={`flex w-[50px] flex-col items-center gap-0.5 rounded-2xl py-2 text-[9px] font-medium ${
              historial || props.filtroFecha ? "bg-[#F0C24E] text-[#2b2118]" : "text-white/60"
            }`}
          >
            <History size={20} /> Historial
          </button>
          <div className="my-0.5 h-px w-8 bg-white/10" />
          {riel.map((b) => (
            <button
              key={b.h}
              onClick={() => elegir(b.h)}
              className={`flex w-[50px] flex-col items-center gap-0.5 rounded-2xl py-2 text-[9px] font-medium ${
                herramienta === b.h ? "bg-[#7C5CE0] text-white" : "text-white/60"
              }`}
            >
              {b.icon}
              {b.label}
            </button>
          ))}
          <div className="my-0.5 h-px w-8 bg-white/10" />
          {COLORES.map((c) => (
            <button
              key={c.valor}
              onClick={() => props.setColor(c.valor)}
              aria-label={c.label}
              className={`h-8 w-8 shrink-0 rounded-full border-[3px] ${color === c.valor ? "border-white" : "border-transparent"}`}
              style={{ backgroundColor: c.valor }}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
