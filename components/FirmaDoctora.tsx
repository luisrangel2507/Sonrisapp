"use client";

import { useEffect, useState } from "react";
import { PenLine } from "lucide-react";
import { FirmaCanvas } from "@/components/FirmaCanvas";

// Perfil → Mi firma: la doctora la dibuja una vez y se usa en recetas y
// consentimientos como "firma de quien informa" (NOM-004).
export function FirmaDoctora() {
  const [actual, setActual] = useState<string | null>(null);
  const [nueva, setNueva] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    fetch("/api/perfil/firma")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setActual(d?.firma ?? null))
      .catch(() => {});
  }, []);

  async function guardar() {
    if (!nueva) return;
    const r = await fetch("/api/perfil/firma", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firma: nueva }),
    });
    if (r.ok) {
      setActual(nueva);
      setEditando(false);
      setNueva(null);
      setAviso("Firma guardada. Ya aparece en recetas y consentimientos.");
    } else setAviso("No se pudo guardar la firma.");
  }

  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
        <PenLine size={13} /> Mi firma
      </div>
      {!editando && actual && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={actual} alt="Firma" className="mx-auto h-24 rounded-xl border border-[#EFE9DC] bg-white p-2" />
      )}
      {!editando && !actual && (
        <p className="text-sm text-[#8a8272]">
          Aún no hay firma. Dibújala una vez y se pondrá sola en las recetas y en los consentimientos (firma de quien informa).
        </p>
      )}
      {editando ? (
        <div className="space-y-2">
          <FirmaCanvas onCambio={setNueva} />
          <div className="flex gap-2">
            <button onClick={guardar} disabled={!nueva} className="flex-1 rounded-full btn-vino py-2 text-[13px] font-semibold text-white disabled:opacity-50">
              Guardar firma
            </button>
            <button onClick={() => setEditando(false)} className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] text-[#8a8272]">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditando(true)}
          className="mt-3 w-full rounded-full border border-[#E3C3C9] bg-[#F5E7E9] py-2 text-[13px] font-semibold text-[#7A1E33]"
        >
          {actual ? "Cambiar firma" : "Dibujar mi firma"}
        </button>
      )}
      {aviso && <p className="mt-2 text-center text-[12px] text-[#3F6B33]">{aviso}</p>}
    </div>
  );
}
