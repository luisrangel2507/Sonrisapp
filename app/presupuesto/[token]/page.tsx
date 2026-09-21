"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, CheckCircle2, X, XCircle } from "lucide-react";
import { DOCTORA } from "@/lib/panel-data";
import { formatearDinero } from "@/lib/dinero";
import type { PresupuestoItem } from "@/lib/types";

interface PresupuestoPublico {
  id: number;
  titulo: string;
  notas: string | null;
  estado: "pendiente" | "aprobado" | "rechazado";
  nombre_respuesta: string | null;
  respondido_en: string | null;
  paciente_nombre: string;
  items: PresupuestoItem[];
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

export default function PresupuestoPublicoPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [datos, setDatos] = useState<PresupuestoPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [invalido, setInvalido] = useState(false);
  const [nombreRespuesta, setNombreRespuesta] = useState("");
  const [enviando, setEnviando] = useState<"aprobado" | "rechazado" | null>(null);
  const [error, setError] = useState("");
  const [respondidoAhora, setRespondidoAhora] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/presupuesto/${token}`);
        const data = await res.json();
        if (!res.ok || !data.presupuesto) {
          setInvalido(true);
          setCargando(false);
          return;
        }
        setDatos(data.presupuesto);
        setNombreRespuesta(data.presupuesto.paciente_nombre);
        setCargando(false);
      } catch {
        setInvalido(true);
        setCargando(false);
      }
    })();
  }, [token]);

  async function responder(estado: "aprobado" | "rechazado") {
    if (!nombreRespuesta.trim() || enviando) return;
    setEnviando(estado);
    setError("");
    try {
      const res = await fetch(`/api/presupuesto/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, nombre_respuesta: nombreRespuesta.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "");
      setDatos((prev) => (prev ? { ...prev, ...data.presupuesto } : prev));
      setRespondidoAhora(true);
    } catch {
      setError("No se pudo guardar tu respuesta. Intenta de nuevo.");
    } finally {
      setEnviando(null);
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

  const total = datos.items.reduce((suma, it) => suma + it.cantidad * it.precio_unitario, 0);
  const yaRespondido = datos.estado !== "pendiente";

  return (
    <div className="min-h-dvh bg-[#F5F1EA]">
      <div className="mx-auto max-w-md space-y-4 px-4 pb-10 pt-6">
        <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-vina-sonrisas.png" alt="Viña Sonrisas" className="mx-auto h-auto w-52" />
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
            Presupuesto / cotización
          </div>
          <div className="mt-1 text-sm font-medium text-[#2b2118]">{DOCTORA.nombre}</div>
        </div>

        <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
          <h2 className="text-base font-bold text-[#2b2118]">{datos.titulo}</h2>
          {datos.notas && <p className="mt-2 whitespace-pre-wrap text-[13px] text-[#8a8272]">{datos.notas}</p>}

          <div className="mt-4 space-y-2">
            {datos.items.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-3 border-b border-[#EFE9DC] pb-2 text-sm">
                <div>
                  <div className="font-medium text-[#2b2118]">{it.concepto}</div>
                  {it.cantidad !== 1 && (
                    <div className="text-[12px] text-[#a49c8a]">
                      {it.cantidad} × {formatearDinero(it.precio_unitario)}
                    </div>
                  )}
                </div>
                <div className="shrink-0 font-semibold text-[#2b2118]">
                  {formatearDinero(it.cantidad * it.precio_unitario)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#2b2118]">Total</span>
            <span className="text-lg font-bold text-[#3F6B33]">{formatearDinero(total)}</span>
          </div>
        </div>

        {yaRespondido ? (
          <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-center">
            {datos.estado === "aprobado" ? (
              <CheckCircle2 className="mx-auto mb-2 text-[#3F6B33]" size={36} />
            ) : (
              <XCircle className="mx-auto mb-2 text-[#B0503A]" size={36} />
            )}
            <p className="text-base font-semibold text-[#2b2118]">
              {respondidoAhora
                ? datos.estado === "aprobado"
                  ? "¡Gracias, quedó aprobado!"
                  : "Quedó registrado que no lo aprobaste"
                : datos.estado === "aprobado"
                  ? "Este presupuesto ya fue aprobado"
                  : "Este presupuesto ya fue rechazado"}
            </p>
            {datos.respondido_en && (
              <p className="mt-1 text-[12px] text-[#a49c8a]">
                Por {datos.nombre_respuesta} el {formatearFechaHora(datos.respondido_en)}
              </p>
            )}
            {respondidoAhora && <p className="mt-4 text-sm text-[#8a8272]">Ya puedes cerrar esta ventana.</p>}
          </div>
        ) : (
          <div className="space-y-3 rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
            <div>
              <label className="block text-[11px] font-medium text-[#a49c8a]">Tu nombre</label>
              <input
                value={nombreRespuesta}
                onChange={(e) => setNombreRespuesta(e.target.value)}
                placeholder="Nombre completo"
                className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
              />
            </div>

            {error && <p className="text-center text-sm text-[#B0503A]">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => responder("aprobado")}
                disabled={!nombreRespuesta.trim() || enviando !== null}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3 text-[14px] font-semibold text-white disabled:opacity-50"
              >
                <Check size={15} /> {enviando === "aprobado" ? "Guardando…" : "Aprobar"}
              </button>
              <button
                onClick={() => responder("rechazado")}
                disabled={!nombreRespuesta.trim() || enviando !== null}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#EFE9DC] bg-white py-3 text-[14px] font-semibold text-[#B0503A] disabled:opacity-50"
              >
                <X size={15} /> {enviando === "rechazado" ? "Guardando…" : "Rechazar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
