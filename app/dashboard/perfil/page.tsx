"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, LogOut, Camera, UserCog } from "lucide-react";
import { TRATAMIENTOS, DOCTORA } from "@/lib/panel-data";

const FOTO_MAX_DIM = 480;
const FOTO_CALIDAD = 0.85;

function comprimirImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, FOTO_MAX_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala);
      const h = Math.round(img.height * escala);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", FOTO_CALIDAD));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

export default function PerfilPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const [foto, setFoto] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState("");

  async function cerrarSesion() {
    if (cerrandoSesion) return;
    setCerrandoSesion(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    fetch("/api/precios-servicios")
      .then((res) => res.json())
      .then((data) => {
        const mapa: Record<string, string> = {};
        for (const p of data.precios ?? []) {
          mapa[p.servicio] = p.precio != null ? String(p.precio) : "";
        }
        setPrecios(mapa);
        setCargando(false);
      });

    fetch("/api/perfil")
      .then((res) => res.json())
      .then((data) => setFoto(data.foto ?? null));
  }, []);

  async function guardar() {
    setGuardando(true);
    setGuardado(false);
    await fetch("/api/precios-servicios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precios }),
    });
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || subiendoFoto) return;

    if (!file.type.startsWith("image/")) {
      setErrorFoto("Elige un archivo de imagen.");
      return;
    }

    setErrorFoto("");
    setSubiendoFoto(true);
    const anterior = foto;
    try {
      const dataUrl = await comprimirImagen(file);
      setFoto(dataUrl);
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foto: dataUrl }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "error al guardar");
    } catch (err) {
      setFoto(anterior);
      setErrorFoto(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  }

  return (
    <div className="mx-4 mt-2 space-y-4 pb-10">
      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={elegirFoto}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={subiendoFoto}
          className="group relative mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#EFE9DC] bg-[#F5F1EA] disabled:opacity-70"
          aria-label="Cambiar foto de perfil"
        >
          {foto ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={foto} alt="Foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <UserCog size={34} className="text-[#a49c8a]" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera size={20} className="text-white" />
          </span>
          <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#2b2118]">
            <Camera size={12} className="text-white" />
          </span>
        </button>
        {subiendoFoto && <p className="mt-2 text-[11px] text-[#a49c8a]">Subiendo foto…</p>}
        {errorFoto && <p className="mt-2 text-[11px] text-[#B0503A]">{errorFoto}</p>}

        <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
          Perfil del dentista
        </div>
        <div className="mt-1 text-sm font-medium text-[#2b2118]">{DOCTORA.nombre}</div>
        <div className="text-xs text-[#a49c8a]">Cédula profesional: {DOCTORA.cedula}</div>
      </div>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#C96F3B]">
          Precios por servicio
        </div>
        <p className="mb-4 text-[12px] text-[#a49c8a]">
          Se usan para sugerir el monto al agendar una cita. Déjalo vacío si el precio varía caso por caso.
        </p>

        {cargando ? (
          <p className="text-sm text-[#8a8272]">Cargando…</p>
        ) : (
          <div className="space-y-3">
            {TRATAMIENTOS.map((servicio) => (
              <div key={servicio} className="flex items-center justify-between gap-3">
                <label className="text-sm text-[#2b2118]">{servicio}</label>
                <div className="relative w-32">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#a49c8a]">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={precios[servicio] ?? ""}
                    onChange={(e) => setPrecios((prev) => ({ ...prev, [servicio]: e.target.value }))}
                    placeholder="—"
                    className="w-full rounded-xl border border-[#EFE9DC] bg-white py-2 pl-6 pr-3 text-right text-sm outline-none focus:border-[#C96F3B]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={guardar}
          disabled={cargando || guardando}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          <Save size={15} /> {guardando ? "Guardando…" : guardado ? "Guardado ✓" : "Guardar precios"}
        </button>
      </div>

      <button
        onClick={cerrarSesion}
        disabled={cerrandoSesion}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-[#EFE9DC] bg-white/70 py-3 text-[14px] font-semibold text-[#B0503A] disabled:opacity-50"
      >
        <LogOut size={15} /> {cerrandoSesion ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
    </div>
  );
}
