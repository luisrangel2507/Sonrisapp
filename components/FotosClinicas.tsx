"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, Trash2, ImageIcon } from "lucide-react";

interface Foto {
  id: number;
  etapa: string;
  nota: string | null;
  miniatura: string;
  tomada_en: string;
}

const ETAPAS = [
  { clave: "antes", label: "Antes" },
  { clave: "durante", label: "Durante" },
  { clave: "despues", label: "Después" },
  { clave: "otra", label: "Otra" },
];

// Reduce la foto en el navegador antes de subirla (lado mayor `max` px,
// JPEG) para que pese poco aunque venga directo de la cámara.
function reducir(archivo: File, max: number, calidad: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", calidad));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(archivo);
  });
}

export function FotosClinicas({ pacienteId }: { pacienteId: number }) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [etapa, setEtapa] = useState("antes");
  const [nota, setNota] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [abierta, setAbierta] = useState<{ foto: Foto; imagen: string | null } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/pacientes/${pacienteId}/fotos`)
      .then((r) => (r.ok ? r.json() : { fotos: [] }))
      .then((d) => setFotos(d.fotos ?? []))
      .catch(() => {});
  }, [pacienteId]);

  async function subir(archivos: FileList | null) {
    if (!archivos?.length) return;
    setSubiendo(true);
    setError("");
    try {
      for (const archivo of Array.from(archivos)) {
        const [imagen, miniatura] = await Promise.all([reducir(archivo, 1600, 0.82), reducir(archivo, 360, 0.7)]);
        const res = await fetch(`/api/pacientes/${pacienteId}/fotos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagen, miniatura, etapa, nota }),
        });
        if (!res.ok) throw new Error();
        const { foto } = await res.json();
        setFotos((f) => [foto, ...f]);
      }
      setNota("");
    } catch {
      setError("No se pudo subir la foto. Intenta de nuevo.");
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = "";
    }
  }

  async function abrir(foto: Foto) {
    setAbierta({ foto, imagen: null });
    const res = await fetch(`/api/pacientes/${pacienteId}/fotos/${foto.id}`);
    const d = res.ok ? await res.json() : null;
    setAbierta({ foto, imagen: d?.imagen ?? foto.miniatura });
  }

  async function quitar(foto: Foto) {
    const motivo = window.prompt("¿Por qué quitas esta foto? (queda registrado)", "Foto repetida o equivocada");
    if (motivo === null) return;
    await fetch(`/api/pacientes/${pacienteId}/fotos/${foto.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });
    setFotos((f) => f.filter((x) => x.id !== foto.id));
    setAbierta(null);
  }

  const etiqueta = (clave: string) => ETAPAS.find((e) => e.clave === clave)?.label ?? clave;

  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#803449]">
          <ImageIcon size={13} /> Fotos clínicas
        </div>
        <span className="text-[11px] text-[#a49c8a]">{fotos.length} foto{fotos.length === 1 ? "" : "s"}</span>
      </div>

      <div className="mt-3 flex gap-1.5">
        {ETAPAS.map((e) => (
          <button
            key={e.clave}
            type="button"
            onClick={() => setEtapa(e.clave)}
            className={`flex-1 rounded-full border px-2 py-1.5 text-[12px] font-semibold ${
              etapa === e.clave ? "border-[#7A1E33] bg-[#7A1E33] text-white" : "border-[#EFE9DC] bg-white text-[#8a8272]"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Nota (opcional, ej. vista frontal)"
        className="mt-2 w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
      />
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => subir(e.target.files)}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={subiendo}
        className="btn-vino mt-2 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[13px] font-semibold disabled:opacity-50"
      >
        <Camera size={15} /> {subiendo ? "Subiendo…" : `Tomar o subir foto (${etiqueta(etapa)})`}
      </button>
      {error && <p className="mt-2 text-center text-[12px] text-[#B0503A]">{error}</p>}

      {fotos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {fotos.map((f) => (
            <button key={f.id} type="button" onClick={() => abrir(f)} className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.miniatura} alt={etiqueta(f.etapa)} className="aspect-square w-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {etiqueta(f.etapa)} · {new Date(f.tomada_en).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" })}
              </span>
            </button>
          ))}
        </div>
      )}

      {abierta && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setAbierta(null)}>
          <div className="flex items-center justify-between p-3 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm">
              <b>{etiqueta(abierta.foto.etapa)}</b> ·{" "}
              {new Date(abierta.foto.tomada_en).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
              {abierta.foto.nota ? ` · ${abierta.foto.nota}` : ""}
            </div>
            <div className="flex gap-1">
              <button onClick={() => quitar(abierta.foto)} className="rounded-full p-2 hover:bg-white/10" aria-label="Quitar foto">
                <Trash2 size={20} />
              </button>
              <button onClick={() => setAbierta(null)} className="rounded-full p-2 hover:bg-white/10" aria-label="Cerrar">
                <X size={22} />
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center p-3">
            {abierta.imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={abierta.imagen} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
            ) : (
              <p className="text-sm text-white/70">Cargando…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
