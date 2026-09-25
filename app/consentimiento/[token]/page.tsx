"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, PenLine } from "lucide-react";
import { CLINICA, DOCTORA } from "@/lib/panel-data";
import { FirmaCanvas } from "@/components/FirmaCanvas";

interface ConsentimientoPublico {
  id: number;
  titulo: string;
  contenido: string;
  estado: "pendiente" | "firmado";
  firma: string | null;
  nombre_firma: string | null;
  firmado_en: string | null;
  paciente_nombre: string;
}

function formatearFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// El contenido llega como texto plano con párrafos separados por línea
// en blanco (ver lib/consentimiento-expediente.ts). Aquí se interpreta
// esa estructura —encabezados cortos terminados en ":", listas "1. …",
// cierre "Firmo de conformidad…"— para que se lea como un documento
// legal formal en vez de un bloque de texto corrido.
function ContenidoConsentimiento({ contenido }: { contenido: string }) {
  const bloques = contenido
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const elementos: ReactNode[] = [];
  let listaActual: string[] = [];

  function flushLista(key: string) {
    if (listaActual.length === 0) return;
    elementos.push(
      <ol key={key} className="space-y-2.5">
        {listaActual.map((item, i) => {
          const m = item.match(/^(\d+)\.\s*([\s\S]+)$/);
          return (
            <li key={i} className="flex gap-2.5">
              <span className="shrink-0 font-semibold text-[#803449]">{m ? `${m[1]}.` : `${i + 1}.`}</span>
              <span className="text-justify">{m ? m[2] : item}</span>
            </li>
          );
        })}
      </ol>
    );
    listaActual = [];
  }

  bloques.forEach((bloque, idx) => {
    if (/^\d+\.\s/.test(bloque)) {
      listaActual.push(bloque);
      return;
    }
    flushLista(`lista-${idx}`);

    if (bloque.length < 60 && bloque.endsWith(":")) {
      elementos.push(
        <p key={idx} className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-[#803449]">
          {bloque}
        </p>
      );
    } else if (bloque.startsWith("Firmo de conformidad")) {
      elementos.push(
        <p key={idx} className="pt-2 text-justify italic text-[#5c5648]">
          {bloque}
        </p>
      );
    } else {
      elementos.push(
        <p key={idx} className="text-justify">
          {bloque}
        </p>
      );
    }
  });
  flushLista("lista-final");

  return <div className="space-y-3.5">{elementos}</div>;
}

export default function ConsentimientoPublicoPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [datos, setDatos] = useState<ConsentimientoPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [invalido, setInvalido] = useState(false);
  const [nombreFirma, setNombreFirma] = useState("");
  const [firma, setFirma] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [firmadoAhora, setFirmadoAhora] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/consentimiento/${token}`);
        const data = await res.json();
        if (!res.ok || !data.consentimiento) {
          setInvalido(true);
          setCargando(false);
          return;
        }
        setDatos(data.consentimiento);
        setNombreFirma(data.consentimiento.paciente_nombre);
        setCargando(false);
      } catch {
        setInvalido(true);
        setCargando(false);
      }
    })();
  }, [token]);

  async function firmar() {
    if (!firma || !nombreFirma.trim() || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(`/api/consentimiento/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_firma: nombreFirma.trim(), firma }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "");
      setDatos((prev) => (prev ? { ...prev, ...data.consentimiento } : prev));
      setFirmadoAhora(true);
    } catch {
      setError("No se pudo guardar tu firma. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F1EA]">
        <p className="text-sm text-[#8a8272]">Cargando…</p>
      </div>
    );
  }

  if (invalido || !datos) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F1EA] px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-[#2b2118]">Este link ya no es válido</p>
          <p className="mt-2 text-sm text-[#8a8272]">Pídele a tu clínica que te comparta un link nuevo.</p>
        </div>
      </div>
    );
  }

  const yaFirmado = datos.estado === "firmado";

  return (
    <div className="min-h-dvh bg-[#EDE7D8]">
      <div className="mx-auto max-w-md space-y-4 px-4 pb-10 pt-6">
        {/* Membrete formal — mismo criterio que el encabezado de los PDFs
            de la clínica (lib/pdf.tsx: EncabezadoPdf). */}
        <div className="rounded-2xl border-b-[3px] border-[#803449] bg-white px-5 pb-4 pt-5 text-center shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-vina-sonrisas.png" alt="Viña Sonrisas" className="mx-auto h-auto w-36" />
          <p className="mt-2.5 font-serif text-lg font-bold text-[#803449]">Viña Sonrisas</p>
          <p className="text-[11px] text-[#8a8272]">Odontología Estética</p>
          <p className="mt-2 text-[12px] font-medium text-[#2b2118]">
            {DOCTORA.nombre} · Céd. Prof. {DOCTORA.cedula}
          </p>
          <p className="text-[11px] text-[#8a8272]">{CLINICA.direccion}</p>
        </div>

        <div className="rounded-2xl border border-[#EFE9DC] bg-white px-5 py-6 shadow-sm">
          <div className="mb-4 border-b-2 border-double border-[#e2d9c4] pb-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a49c8a]">
              Consentimiento informado
            </p>
            <h2 className="mt-1.5 font-serif text-[19px] font-bold leading-snug text-[#2b2118]">{datos.titulo}</h2>
          </div>
          <div className="font-serif text-[13.5px] leading-relaxed text-[#3d372c]">
            <ContenidoConsentimiento contenido={datos.contenido} />
          </div>
        </div>

        {yaFirmado ? (
          <div className="rounded-2xl border border-[#EFE9DC] bg-white p-5 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-2 text-[#3F6B33]" size={36} />
            <p className="text-base font-semibold text-[#2b2118]">
              {firmadoAhora ? "¡Gracias, quedó firmado!" : "Este consentimiento ya fue firmado"}
            </p>
            {datos.firmado_en && (
              <p className="mt-1 text-[12px] text-[#a49c8a]">
                Firmado por {datos.nombre_firma} el {formatearFechaHora(datos.firmado_en)}
              </p>
            )}
            {datos.firma && (
              <img
                src={datos.firma}
                alt="Firma"
                className="mx-auto mt-4 h-24 rounded-xl border border-[#EFE9DC] bg-white p-2"
              />
            )}
            {firmadoAhora && <p className="mt-4 text-sm text-[#8a8272]">Ya puedes cerrar esta ventana.</p>}
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-[#EFE9DC] bg-white p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-[#a49c8a]">Firma de conformidad</p>
            <div>
              <label className="block text-[11px] font-medium text-[#a49c8a]">Nombre de quien firma</label>
              <input
                value={nombreFirma}
                onChange={(e) => setNombreFirma(e.target.value)}
                placeholder="Nombre completo"
                className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#a49c8a]">Firma aquí</label>
              <FirmaCanvas onCambio={setFirma} />
            </div>

            {error && <p className="text-center text-sm text-[#B0503A]">{error}</p>}

            <button
              onClick={firmar}
              disabled={!firma || !nombreFirma.trim() || enviando}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              <PenLine size={15} /> {enviando ? "Guardando…" : "Firmar y aceptar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
