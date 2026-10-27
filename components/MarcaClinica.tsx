"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, ImageUp } from "lucide-react";

// Perfil → Identidad de la clínica (solo admin). Configura nombre, logo,
// color, datos del responsable y dirección para vender la app a otros
// consultorios. Lo que se deje vacío usa los valores por defecto.
interface Campos {
  clinica_nombre: string;
  clinica_lema: string;
  color_marca: string;
  doctor_nombre: string;
  doctor_titulo: string;
  cedula: string;
  direccion: string;
  horario: string;
  logo: string | null;
}

// Reduce el logo manteniendo transparencia (PNG), lado máximo 480 px.
function reducirLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, 480 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function MarcaClinica() {
  const [c, setC] = useState<Campos | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/marca")
      .then((r) => (r.ok ? r.json() : null))
      .then((m) =>
        setC({
          clinica_nombre: m?.clinicaNombre ?? "",
          clinica_lema: m?.clinicaLema ?? "",
          color_marca: m?.colorMarca ?? "#7A1E33",
          doctor_nombre: m?.doctorNombre ?? "",
          doctor_titulo: m?.doctorTitulo ?? "",
          cedula: m?.cedula ?? "",
          direccion: m?.direccion ?? "",
          horario: m?.horario ?? "",
          logo: m?.logo ?? null,
        })
      )
      .catch(() => {});
  }, []);

  function set<K extends keyof Campos>(k: K, v: Campos[K]) {
    setC((p) => (p ? { ...p, [k]: v } : p));
  }

  async function elegirLogo(file: File | undefined) {
    if (!file) return;
    try {
      set("logo", await reducirLogo(file));
    } catch {
      setAviso("No se pudo leer el logo.");
    }
  }

  async function guardar() {
    if (!c || guardando) return;
    setGuardando(true);
    setAviso("");
    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      setAviso(res.ok ? "Guardado. Vuelve a abrir la app para ver los cambios." : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  if (!c) return null;
  const campo = "w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm text-[#2b2118] outline-none focus:border-[#803449]";
  const label = "mb-1 block text-[11px] font-medium text-[#a49c8a]";

  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#803449]">
        <Palette size={13} /> Identidad de la clínica
      </div>
      <p className="mb-3 mt-2 text-[12px] text-[#a49c8a]">
        Para personalizar la app con tu marca. Lo que dejes vacío usa los valores de la clínica por defecto.
      </p>

      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EFE9DC] bg-white">
          {c.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logo} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <ImageUp size={20} className="text-[#c9c2b3]" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => elegirLogo(e.target.files?.[0])} />
          <button onClick={() => logoInput.current?.click()} className="rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#7A1E33]">
            Subir logo
          </button>
          {c.logo && (
            <button onClick={() => set("logo", null)} className="rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#8a8272]">
              Quitar
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Nombre de la clínica</label>
            <input className={campo} value={c.clinica_nombre} maxLength={80} onChange={(e) => set("clinica_nombre", e.target.value)} placeholder="Viña Sonrisas" />
          </div>
          <div>
            <label className={label}>Color de marca</label>
            <input type="color" value={c.color_marca} onChange={(e) => set("color_marca", e.target.value)} className="h-[38px] w-full rounded-xl border border-[#EFE9DC] bg-white px-1" />
          </div>
        </div>
        <div>
          <label className={label}>Lema (debajo del nombre)</label>
          <input className={campo} value={c.clinica_lema} maxLength={120} onChange={(e) => set("clinica_lema", e.target.value)} placeholder="Odontología Estética" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Nombre del responsable</label>
            <input className={campo} value={c.doctor_nombre} maxLength={120} onChange={(e) => set("doctor_nombre", e.target.value)} placeholder="Dra. ..." />
          </div>
          <div>
            <label className={label}>Cédula profesional</label>
            <input className={campo} value={c.cedula} maxLength={30} onChange={(e) => set("cedula", e.target.value)} />
          </div>
        </div>
        <div>
          <label className={label}>Dirección</label>
          <input className={campo} value={c.direccion} maxLength={200} onChange={(e) => set("direccion", e.target.value)} />
        </div>
        <div>
          <label className={label}>Horario</label>
          <input className={campo} value={c.horario} maxLength={120} onChange={(e) => set("horario", e.target.value)} />
        </div>
      </div>

      <button onClick={guardar} disabled={guardando} className="btn-vino mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold disabled:opacity-50">
        {guardando ? "Guardando…" : "Guardar identidad"}
      </button>
      {aviso && <p className="mt-2 text-center text-[12px] text-[#3F6B33]">{aviso}</p>}
    </div>
  );
}
