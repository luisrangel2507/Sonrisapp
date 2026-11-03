"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

interface Datos {
  total: number;
  respondidas: number;
  promedio: number | null;
  distribucion: { calificacion: number; n: number }[];
  ultimas: { id: number; paciente_id: number; nombre: string; calificacion: number; comentario: string | null; respondido_en: string }[];
}

// Reportes → satisfacción de los pacientes (encuesta después de cada consulta).
export function Satisfaccion() {
  const [d, setD] = useState<Datos | null>(null);
  useEffect(() => {
    fetch("/api/encuestas")
      .then((r) => (r.ok ? r.json() : null))
      .then(setD)
      .catch(() => {});
  }, []);
  if (!d) return null;
  const max = Math.max(1, ...d.distribucion.map((x) => x.n));
  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">Satisfacción · 90 días</div>
        <div className="text-[11px] text-[#a49c8a]">
          {d.respondidas} de {d.total} respondieron
        </div>
      </div>
      {d.respondidas === 0 ? (
        <p className="text-sm text-[#a49c8a]">
          Aún no hay respuestas. La encuesta se manda sola por WhatsApp cuando marcas una cita como completada.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#2b2118]">{d.promedio?.toFixed(1)}</div>
              <div className="flex justify-center text-[#E0A526]">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={12} className={n <= Math.round(d.promedio ?? 0) ? "fill-[#E0A526]" : ""} />
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((n) => {
                const v = d.distribucion.find((x) => x.calificacion === n)?.n ?? 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-[11px] text-[#8a8272]">
                    <span className="w-3">{n}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EFE9DC]">
                      <div className="h-full rounded-full bg-[#E0A526]" style={{ width: `${(v / max) * 100}%` }} />
                    </div>
                    <span className="w-5 text-right">{v}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {d.ultimas.map((u) => (
              <Link
                key={u.id}
                href={`/dashboard/pacientes/${u.paciente_id}`}
                className={`block rounded-2xl px-3 py-2 text-[12px] ${u.calificacion <= 3 ? "bg-[#FBEAE8]" : "bg-[#FBF9F5]"}`}
              >
                <div className="flex justify-between gap-2">
                  <b className="truncate text-[#2b2118]">{u.nombre}</b>
                  <span className="shrink-0 text-[#E0A526]">{"★".repeat(u.calificacion)}</span>
                </div>
                {u.comentario && <div className="mt-0.5 text-[#8a8272]">{u.comentario}</div>}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
