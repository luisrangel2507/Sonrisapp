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
  informante_nombre?: string | null;
  informante_firma?: string | null;
  testigo1_nombre?: string | null;
  testigo1_firma?: string | null;
  testigo2_nombre?: string | null;
  testigo2_firma?: string | null;
}

function FirmasExtra({ datos }: { datos: ConsentimientoPublico }) {
  const lista = [
    { rol: "Informó", nombre: datos.informante_nombre, firma: datos.informante_firma },
    { rol: "Testigo", nombre: datos.testigo1_nombre, firma: datos.testigo1_firma },
    { rol: "Testigo", nombre: datos.testigo2_nombre, firma: datos.testigo2_firma },
  ].filter((x) => x.nombre);
  if (lista.length === 0) return null;
  return (
    <div className="mt-4 grid grid-cols-1 gap-2 text-left sm:grid-cols-3">
      {lista.map((x, i) => (
        <div key={i} className="rounded-xl border border-[#EFE9DC] p-2 text-center">
          {x.firma && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={x.firma} alt="" className="mx-auto h-12" />
          )}
          <div className="text-[11px] font-semibold text-[#2b2118]">{x.nombre}</div>
          <div className="text-[10px] text-[#a49c8a]">{x.rol}</div>
        </div>
      ))}
    </div>
  );
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
  const [expirado, setExpirado] = useState(false);
  const [nombreFirma, setNombreFirma] = useState("");
  const [firma, setFirma] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [firmadoAhora, setFirmadoAhora] = useState(false);
  const [testigos, setTestigos] = useState([
    { nombre: "", firma: null as string | null },
    { nombre: "", firma: null as string | null },
  ]);
  const testigoIncompleto = testigos.some((t) => (t.nombre.trim() ? !t.firma : !!t.firma));

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/consentimiento/${token}`);
        const data = await res.json();
        if (!res.ok || !data.consentimiento) {
          if (res.status === 410) setExpirado(true);
          else setInvalido(true);
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
    if (!firma || !nombreFirma.trim() || enviando || testigoIncompleto) return;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(`/api/consentimiento/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_firma: nombreFirma.trim(),
          firma,
          testigos: testigos.filter((t) => t.nombre.trim() && t.firma).map((t) => ({ nombre: t.nombre.trim(), firma: t.firma })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 410) {
          setExpirado(true);
          return;
        }
        throw new Error(data.error ?? "");
      }
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

  if (expirado) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F1EA] px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-[#2b2118]">Este link ya expiró</p>
          <p className="mt-2 text-sm text-[#8a8272]">
            Pídele a tu clínica que te comparta un consentimiento nuevo para firmarlo.
          </p>
        </div>
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
          <img src="/logo-vina-sonrisas.webp" alt="Viña Sonrisas" className="mx-auto h-auto w-36" />
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
            <FirmasExtra datos={datos} />
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

            {datos.informante_nombre && (
              <div className="rounded-xl bg-[#FBF9F5] p-3 text-[12px] text-[#6f6458]">
                <span className="font-semibold text-[#2b2118]">Informa y recaba el consentimiento:</span> {datos.informante_nombre}
                {datos.informante_firma && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={datos.informante_firma} alt="Firma de quien informa" className="mt-1 h-12" />
                )}
              </div>
            )}

            <p className="pt-2 text-[11px] uppercase tracking-wide text-[#a49c8a]">Testigos (2)</p>
            <p className="-mt-2 text-[11px] text-[#a49c8a]">
              Pueden ser tu acompañante y alguien del personal. Si no hay testigos presentes, déjalo vacío.
            </p>
            {testigos.map((t, i) => (
              <div key={i} className="space-y-1.5 rounded-xl border border-[#EFE9DC] p-3">
                <input
                  value={t.nombre}
                  onChange={(e) => setTestigos((ts) => ts.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))}
                  placeholder={`Nombre del testigo ${i + 1}`}
                  className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
                />
                <FirmaCanvas onCambio={(f) => setTestigos((ts) => ts.map((x, j) => (j === i ? { ...x, firma: f } : x)))} />
              </div>
            ))}
            {testigoIncompleto && <p className="text-center text-[12px] text-[#B0503A]">Cada testigo necesita nombre y firma.</p>}

            {error && <p className="text-center text-sm text-[#B0503A]">{error}</p>}

            <button
              onClick={firmar}
              disabled={!firma || !nombreFirma.trim() || enviando || testigoIncompleto}
              className="flex w-full items-center justify-center gap-2 rounded-full btn-vino py-3 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              <PenLine size={15} /> {enviando ? "Guardando…" : "Firmar y aceptar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
