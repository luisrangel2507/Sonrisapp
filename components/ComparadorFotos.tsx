"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export interface FotoComparable {
  id: number;
  etapa: string;
  nota: string | null;
  miniatura: string;
  tomada_en: string;
}

const ETIQUETA: Record<string, string> = { antes: "Antes", durante: "Durante", despues: "Después", otra: "Otra" };
const fecha = (f: string) =>
  new Date(f).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const nombreFoto = (f: FotoComparable) => `${ETIQUETA[f.etapa] ?? f.etapa} · ${fecha(f.tomada_en)}${f.nota ? ` · ${f.nota}` : ""}`;

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Comparador antes/después: deslizador sobre la misma foto o lado a lado,
// y descarga de una sola imagen con las dos fotos para enseñar al paciente.
export function ComparadorFotos({
  pacienteId,
  fotos,
  onCerrar,
}: {
  pacienteId: number;
  fotos: FotoComparable[];
  onCerrar: () => void;
}) {
  const ordenadas = [...fotos].sort((a, b) => +new Date(a.tomada_en) - +new Date(b.tomada_en));
  const inicial = ordenadas.find((f) => f.etapa === "antes") ?? ordenadas[0];
  const final = [...ordenadas].reverse().find((f) => f.etapa === "despues") ?? ordenadas[ordenadas.length - 1];
  const [idA, setIdA] = useState(inicial?.id);
  const [idB, setIdB] = useState(final?.id);
  const [imagenes, setImagenes] = useState<Record<number, string>>({});
  const [modo, setModo] = useState<"deslizar" | "lado">("deslizar");
  const [corte, setCorte] = useState(50);
  const [descargando, setDescargando] = useState(false);

  const a = fotos.find((f) => f.id === idA);
  const b = fotos.find((f) => f.id === idB);

  useEffect(() => {
    for (const f of [a, b]) {
      if (!f || imagenes[f.id]) continue;
      fetch(`/api/pacientes/${pacienteId}/fotos/${f.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setImagenes((m) => ({ ...m, [f.id]: d?.imagen ?? f.miniatura })))
        .catch(() => setImagenes((m) => ({ ...m, [f.id]: f.miniatura })));
    }
  }, [a, b, imagenes, pacienteId]);

  const srcA = a ? imagenes[a.id] ?? a.miniatura : "";
  const srcB = b ? imagenes[b.id] ?? b.miniatura : "";

  async function descargar() {
    if (!a || !b || descargando) return;
    setDescargando(true);
    try {
      const [ia, ib] = await Promise.all([cargarImagen(srcA), cargarImagen(srcB)]);
      const alto = 900;
      const anchoA = Math.round((ia.width / ia.height) * alto);
      const anchoB = Math.round((ib.width / ib.height) * alto);
      const margen = 24;
      const barra = 70;
      const canvas = document.createElement("canvas");
      canvas.width = anchoA + anchoB + margen * 3;
      canvas.height = alto + margen * 2 + barra;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#F5F1EA";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(ia, margen, margen, anchoA, alto);
      ctx.drawImage(ib, margen * 2 + anchoA, margen, anchoB, alto);
      ctx.fillStyle = "#2b2118";
      ctx.font = "bold 34px Georgia, serif";
      ctx.textAlign = "center";
      const y = margen + alto + 50;
      ctx.fillText(`${ETIQUETA[a.etapa] ?? "Antes"} · ${fecha(a.tomada_en)}`, margen + anchoA / 2, y);
      ctx.fillText(`${ETIQUETA[b.etapa] ?? "Después"} · ${fecha(b.tomada_en)}`, margen * 2 + anchoA + anchoB / 2, y);
      const url = canvas.toDataURL("image/jpeg", 0.9);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "antes-despues.jpg";
      enlace.click();
    } finally {
      setDescargando(false);
    }
  }

  const selector = (valor: number | undefined, cambiar: (id: number) => void) => (
    <select
      value={valor}
      onChange={(e) => cambiar(Number(e.target.value))}
      className="w-full min-w-0 rounded-xl border border-white/20 bg-white/10 px-2 py-2 text-[12px] text-white"
    >
      {ordenadas.map((f) => (
        <option key={f.id} value={f.id} className="text-black">
          {nombreFoto(f)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
      <div className="flex items-center justify-between p-3">
        <b className="text-sm">Antes y después</b>
        <button onClick={onCerrar} className="rounded-full p-2 hover:bg-white/10" aria-label="Cerrar">
          <X size={22} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3">
        {selector(idA, setIdA)}
        {selector(idB, setIdB)}
      </div>
      <div className="mt-2 flex justify-center gap-1.5 px-3">
        {(["deslizar", "lado"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`rounded-full px-4 py-1.5 text-[12px] font-semibold ${modo === m ? "bg-white text-black" : "bg-white/10 text-white"}`}
          >
            {m === "deslizar" ? "Deslizar" : "Lado a lado"}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        {modo === "deslizar" ? (
          <div className="relative max-h-full w-full max-w-3xl select-none overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={srcB} alt="Después" className="block max-h-[60vh] w-full object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={srcA}
              alt="Antes"
              className="absolute inset-0 h-full w-full object-contain"
              style={{ clipPath: `inset(0 ${100 - corte}% 0 0)` }}
            />
            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white" style={{ left: `${corte}%` }} />
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold">
              {a ? ETIQUETA[a.etapa] : ""}
            </span>
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold">
              {b ? ETIQUETA[b.etapa] : ""}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={corte}
              onChange={(e) => setCorte(Number(e.target.value))}
              aria-label="Deslizar entre antes y después"
              className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
            />
          </div>
        ) : (
          <div className="grid w-full max-w-4xl grid-cols-2 gap-2">
            {[a, b].map((f, i) => (
              <div key={i} className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i === 0 ? srcA : srcB} alt="" className="max-h-[55vh] w-full rounded-lg object-contain" />
                <div className="mt-1 text-[12px] text-white/80">{f ? nombreFoto(f) : ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3">
        <button
          onClick={descargar}
          disabled={descargando}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-[14px] font-semibold text-black disabled:opacity-50"
        >
          <Download size={16} /> {descargando ? "Preparando…" : "Descargar imagen para el paciente"}
        </button>
      </div>
    </div>
  );
}
