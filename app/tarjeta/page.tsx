"use client";

import { useEffect, useState } from "react";
import { MapPin, Clock, Phone, Download, Share2, UserRound } from "lucide-react";

interface TarjetaDentista {
  nombre: string;
  cedula: string;
  especialidades: string[];
  direccion: string;
  horario: string;
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
    `TITLE:Cirujana Dentista — Cédula profesional ${d.cedula}`,
    d.telefono ? `TEL;TYPE=CELL,VOICE:${d.telefono}` : null,
    d.direccion ? `ADR;TYPE=WORK:;;${d.direccion};;;;` : null,
    "END:VCARD",
  ].filter(Boolean);
  return lineas.join("\r\n");
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
    a.download = "dra-daniela-michel-vina-sonrisas.vcf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function compartir() {
    const url = window.location.href;
    const texto = `${datos?.nombre} — Viña Sonrisas`;
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

        <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#EFE9DC] bg-[#F5F1EA]">
            {datos.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={datos.foto} alt={datos.nombre} className="h-full w-full object-cover" />
            ) : (
              <UserRound size={38} className="text-[#a49c8a]" />
            )}
          </div>

          <h1 className="mt-4 text-lg font-bold text-[#2b2118]" style={{ fontFamily: "Georgia, serif" }}>
            {datos.nombre}
          </h1>
          <p className="mt-0.5 text-sm text-[#803449]">Cirujana Dentista</p>
          <p className="mt-0.5 text-xs text-[#a49c8a]">Cédula profesional: {datos.cedula}</p>

          {datos.especialidades.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {datos.especialidades.map((e) => (
                <span
                  key={e}
                  className="rounded-full bg-[#F5E7E9] px-2.5 py-1 text-[11px] font-medium text-[#803449]"
                >
                  {e}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 space-y-2.5 border-t border-[#EFE9DC] pt-4 text-left">
            <div className="flex items-start gap-2.5 text-sm text-[#2b2118]">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[#a49c8a]" />
              <span>{datos.direccion}</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-[#2b2118]">
              <Clock size={16} className="mt-0.5 shrink-0 text-[#a49c8a]" />
              <span>{datos.horario}</span>
            </div>
            {datos.telefono && (
              <a
                href={`tel:${datos.telefono}`}
                className="flex items-start gap-2.5 text-sm text-[#2b2118] underline-offset-2 hover:underline"
              >
                <Phone size={16} className="mt-0.5 shrink-0 text-[#a49c8a]" />
                <span>{datos.telefono}</span>
              </a>
            )}
          </div>

          <div className="mt-6 flex gap-2">
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
    </div>
  );
}
