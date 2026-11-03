"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Star } from "lucide-react";

interface Datos {
  clinica: string;
  nombre: string;
  tratamiento: string | null;
  respondida: boolean;
  calificacion: number | null;
  google: string | null;
}

const TEXTO = ["", "Muy mala", "Mala", "Regular", "Buena", "¡Excelente!"];

export default function EncuestaPage() {
  const { token } = useParams<{ token: string }>();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<{ google: string | null; calificacion: number } | null>(null);

  useEffect(() => {
    fetch(`/api/encuesta/${token}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "No se encontró la encuesta");
        setDatos(d);
        if (d.respondida) setListo({ google: d.google, calificacion: d.calificacion ?? 0 });
      })
      .catch((e) => setError(e.message));
  }, [token]);

  async function enviar() {
    if (!estrellas || enviando) return;
    setEnviando(true);
    setError("");
    const r = await fetch(`/api/encuesta/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calificacion: estrellas, comentario }),
    });
    const d = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) {
      setError(d.error || "No se pudo enviar. Intenta de nuevo.");
      return;
    }
    setListo({ google: d.google ?? null, calificacion: estrellas });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F1EA] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#EFE9DC] bg-white p-6 text-center shadow-sm">
        {!datos && !error && <p className="text-sm text-[#8a8272]">Cargando…</p>}
        {error && !datos && <p className="text-sm text-[#B0503A]">{error}</p>}
        {datos && !listo && (
          <>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-[#803449]">{datos.clinica}</div>
            <h1 className="mt-2 text-2xl font-bold text-[#2b2118]" style={{ fontFamily: "Georgia, serif" }}>
              ¿Cómo te atendimos, {datos.nombre}?
            </h1>
            {datos.tratamiento && <p className="mt-1 text-sm text-[#8a8272]">Tu visita: {datos.tratamiento}</p>}
            <div className="mt-6 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setEstrellas(n)} aria-label={`${n} estrellas`} className="p-1">
                  <Star size={38} className={n <= estrellas ? "fill-[#E0A526] text-[#E0A526]" : "text-[#D8D0BF]"} />
                </button>
              ))}
            </div>
            <div className="mt-1 h-5 text-sm font-semibold text-[#7a5410]">{TEXTO[estrellas]}</div>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder={estrellas && estrellas <= 3 ? "¿Qué podemos mejorar? Nos ayuda mucho saberlo." : "¿Algo que quieras contarnos? (opcional)"}
              className="mt-4 w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
            {error && <p className="mt-2 text-sm text-[#B0503A]">{error}</p>}
            <button
              onClick={enviar}
              disabled={!estrellas || enviando}
              className="btn-vino mt-4 w-full rounded-full py-3 text-[15px] font-semibold text-white disabled:opacity-50"
            >
              {enviando ? "Enviando…" : "Enviar"}
            </button>
          </>
        )}
        {datos && listo && (
          <>
            <div className="text-4xl">{listo.calificacion >= 4 ? "🦷✨" : "🙏"}</div>
            <h1 className="mt-3 text-xl font-bold text-[#2b2118]" style={{ fontFamily: "Georgia, serif" }}>
              ¡Gracias por tu opinión!
            </h1>
            {listo.calificacion >= 4 && listo.google ? (
              <>
                <p className="mt-2 text-sm text-[#8a8272]">
                  Nos alegra mucho. ¿Nos regalas un minuto para dejar tu reseña en Google? Ayuda a que más personas nos encuentren.
                </p>
                <a
                  href={listo.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-vino mt-5 block w-full rounded-full py-3 text-[15px] font-semibold text-white"
                >
                  Dejar reseña en Google
                </a>
              </>
            ) : (
              <p className="mt-2 text-sm text-[#8a8272]">
                {listo.calificacion <= 3
                  ? "Lamentamos que tu experiencia no haya sido la mejor. La clínica ya recibió tu comentario y te contactará."
                  : `Te esperamos pronto en ${datos.clinica}.`}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
