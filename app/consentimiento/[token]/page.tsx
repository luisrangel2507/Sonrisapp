"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, PenLine } from "lucide-react";
import { DOCTORA } from "@/lib/panel-data";
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
    <div className="min-h-dvh bg-[#F5F1EA]">
      <div className="mx-auto max-w-md space-y-4 px-4 pb-10 pt-6">
        <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-center">
          <h1 className="text-[22px] leading-none" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            <span className="font-bold text-[#2b2118]">Viña </span>
            <span className="font-bold italic text-[#C96F3B]">Sonrisas</span>
          </h1>
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
            Consentimiento informado
          </div>
          <div className="mt-1 text-sm font-medium text-[#2b2118]">{DOCTORA.nombre}</div>
        </div>

        <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
          <h2 className="text-base font-bold text-[#2b2118]">{datos.titulo}</h2>
          <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[#5c5648]">{datos.contenido}</p>
        </div>

        {yaFirmado ? (
          <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-center">
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
          <div className="space-y-3 rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
            <div>
              <label className="block text-[11px] font-medium text-[#a49c8a]">Nombre de quien firma</label>
              <input
                value={nombreFirma}
                onChange={(e) => setNombreFirma(e.target.value)}
                placeholder="Nombre completo"
                className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
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
