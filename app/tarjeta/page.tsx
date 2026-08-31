"use client";

import { useEffect, useState } from "react";
import { MapPin, Phone, Download, Share2, UserRound } from "lucide-react";

interface TarjetaDentista {
  nombre: string;
  nombreCorto: string;
  titulo: string;
  cedula: string;
  especialidades: string[];
  direccion: string;
  horario: string;
  sintomas: string[];
  frase: string;
  llamadaAccion: string;
  foto: string | null;
  telefono: string | null;
}

// vCard 3.0 — al abrirse en un celular ofrece "Agregar a contactos"
// directo, sin depender de ninguna app de la clínica.
function construirVCard(d: TarjetaDentista) {
  const lineas = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${d.nombre}`,
    `N:${d.nombre};;;;`,
    "ORG:Viña Sonrisas",
    `TITLE:${d.titulo} — Cédula profesional ${d.cedula}`,
    d.telefono ? `TEL;TYPE=CELL,VOICE:${d.telefono}` : null,
    d.direccion ? `ADR;TYPE=WORK:;;${d.direccion};;;;` : null,
    "END:VCARD",
  ].filter(Boolean);
  return lineas.join("\r\n");
}

// Silueta de corazón, igual a la de la tarjeta física — solo de
// decoración, muy transparente, detrás del contenido.
function CorazonDecorativo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export default function TarjetaDentistaPage() {
  const [datos, setDatos] = useState<TarjetaDentista | null>(null);
  const [cargando, setCargando] = useState(true);
  const [compartido, setCompartido] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tarjeta-dentista");
        const data = await res.json();
        setDatos(data);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  function guardarContacto() {
    if (!datos) return;
    const vcard = construirVCard(datos);
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dra-michell-galvan-vina-sonrisas.vcf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function compartir() {
    const url = window.location.href;
    const texto = `${datos?.nombreCorto} — Viña Sonrisas`;
    if (navigator.share) {
      try {
        await navigator.share({ title: texto, url });
      } catch {
        // el usuario canceló el share, no hacer nada
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCompartido(true);
      setTimeout(() => setCompartido(false), 2500);
    }
  }

  if (cargando || !datos) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F1EA]">
        <p className="text-sm text-[#8a8272]">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F5F1EA]">
      <div className="mx-auto max-w-md space-y-4 px-4 pb-10 pt-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-vina-sonrisas.png" alt="Viña Sonrisas" className="mx-auto h-auto w-44" />

        <div
          className="relative overflow-hidden rounded-[28px] p-6 text-center text-white"
          style={{ background: "linear-gradient(135deg, #B2485F 0%, #803449 130%)" }}
        >
          <CorazonDecorativo className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 text-white/10" />
          <CorazonDecorativo className="pointer-events-none absolute -bottom-14 -right-6 h-52 w-52 text-white/10" />

          <div className="relative">
            <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-white/40 bg-white/10">
              {datos.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={datos.foto} alt={datos.nombreCorto} className="h-full w-full object-cover" />
              ) : (
                <UserRound size={38} className="text-white/70" />
              )}
            </div>

            <h1 className="mt-4 text-xl font-bold uppercase tracking-wide" style={{ fontFamily: "Georgia, serif" }}>
              {datos.nombreCorto}
            </h1>
            <p className="mt-0.5 text-[13px] font-medium uppercase tracking-[0.15em] text-white/80">
              {datos.titulo}
            </p>
            <p className="mt-1 text-[11px] text-white/60">Cédula profesional: {datos.cedula}</p>

            {datos.especialidades.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {datos.especialidades.map((e) => (
                  <span
                    key={e}
                    className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-medium"
                  >
                    {e}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-5 space-y-2.5 border-t border-white/20 pt-4 text-left">
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin size={16} className="mt-0.5 shrink-0 text-white/60" />
                <span>{datos.direccion}</span>
              </div>
              {datos.telefono && (
                <a href={`tel:${datos.telefono}`} className="flex items-start gap-2.5 text-sm underline-offset-2 hover:underline">
                  <Phone size={16} className="mt-0.5 shrink-0 text-white/60" />
                  <span>{datos.telefono}</span>
                </a>
              )}
            </div>

            {datos.sintomas.length > 0 && (
              <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4 text-left">
                <p className="text-[13px] font-semibold">¿Sufres de…?</p>
                <ul className="mt-2 space-y-1">
                  {datos.sintomas.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-[13px] text-white/90">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/70" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-5 text-[13px] font-medium italic text-white/90">{datos.frase}</p>

            <a
              href="/agendar"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-[13px] font-bold text-[#803449]"
            >
              {datos.llamadaAccion}
            </a>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={guardarContacto}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3 text-[13px] font-semibold text-white"
          >
            <Download size={15} /> Guardar contacto
          </button>
          <button
            onClick={compartir}
            className="flex items-center justify-center gap-2 rounded-full border border-[#EFE9DC] bg-white px-4 py-3 text-[13px] font-semibold text-[#2b2118]"
          >
            <Share2 size={15} /> {compartido ? "Copiado ✓" : "Compartir"}
          </button>
        </div>
      </div>
    </div>
  );
}
