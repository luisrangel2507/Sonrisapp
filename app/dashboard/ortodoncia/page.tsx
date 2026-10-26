"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Smile, CalendarClock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatearDinero } from "@/lib/dinero";

interface PacienteOrto {
  presupuesto_id: number;
  paciente_id: number;
  paciente_nombre: string;
  telefono: string | null;
  titulo: string;
  inicio: string;
  pago_inicial: number | null;
  monto_ajuste: number | null;
  ajustes_planeados: number | null;
  ajustes_hechos: number;
  ultimo_ajuste: string | null;
  proximo_ajuste: string | null;
  pagado: number;
  esperado: number;
  adeudo: number;
  diasSinAjuste: number | null;
  atrasado: boolean;
}

const fecha = (f: string) => new Date(f).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

export default function OrtodonciaPage() {
  const [pacientes, setPacientes] = useState<PacienteOrto[] | null>(null);

  useEffect(() => {
    fetch("/api/ortodoncia")
      .then((r) => (r.ok ? r.json() : { pacientes: [] }))
      .then((d) => setPacientes(d.pacientes ?? []))
      .catch(() => setPacientes([]));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 md:px-0">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-[#2b2118]">
        <Smile size={22} className="text-[#7A1E33]" /> Ortodoncia
      </h1>
      <p className="text-sm text-[#8a8272]">
        Pacientes que aprobaron un presupuesto de brackets u ortodoncia. Los ajustes se cuentan con las citas completadas
        de ortodoncia desde que aprobaron.
      </p>

      {pacientes === null ? (
        <p className="text-sm text-[#a49c8a]">Cargando…</p>
      ) : pacientes.length === 0 ? (
        <p className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-sm text-[#a49c8a] shadow-sm">
          Aún no hay pacientes con un presupuesto de ortodoncia aprobado.
        </p>
      ) : (
        pacientes.map((p) => {
          const avance = p.ajustes_planeados ? Math.min(1, p.ajustes_hechos / p.ajustes_planeados) : null;
          return (
            <Link
              key={p.paciente_id}
              href={`/dashboard/pacientes/${p.paciente_id}`}
              className="block rounded-3xl border border-[#EFE9DC] bg-white/70 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[#2b2118]">{p.paciente_nombre}</div>
                  <div className="text-xs text-[#a49c8a]">
                    {p.titulo} · desde {fecha(p.inicio)}
                  </div>
                </div>
                {p.adeudo > 0 ? (
                  <span className="shrink-0 rounded-full bg-[#FBEAE8] px-2.5 py-1 text-[11px] font-semibold text-[#B0503A]">
                    Debe {formatearDinero(p.adeudo)}
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#EEF4EA] px-2.5 py-1 text-[11px] font-semibold text-[#3F6B33]">
                    <CheckCircle2 size={11} /> Al corriente
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-baseline justify-between text-xs text-[#8a8272]">
                <span>
                  <b className="text-[#2b2118]">{p.ajustes_hechos}</b>
                  {p.ajustes_planeados ? ` de ${p.ajustes_planeados}` : ""} ajustes
                </span>
                {p.monto_ajuste ? <span>{formatearDinero(p.monto_ajuste)} por ajuste</span> : null}
              </div>
              {avance !== null && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#EFE9DC]">
                  <div className="h-full rounded-full bg-[#7A1E33]" style={{ width: `${avance * 100}%` }} />
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-xl bg-[#FBF9F5] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-[#a49c8a]">Último ajuste</div>
                  <div className="font-medium text-[#2b2118]">
                    {p.ultimo_ajuste ? `${fecha(p.ultimo_ajuste)} (hace ${p.diasSinAjuste} días)` : "—"}
                  </div>
                </div>
                <div className={`rounded-xl px-3 py-2 ${p.atrasado ? "bg-[#FDF1DC]" : "bg-[#FBF9F5]"}`}>
                  <div className="text-[10px] uppercase tracking-wide text-[#a49c8a]">Próximo ajuste</div>
                  <div className={`flex items-center gap-1 font-medium ${p.atrasado ? "text-[#B0834A]" : "text-[#2b2118]"}`}>
                    {p.proximo_ajuste ? (
                      <>
                        <CalendarClock size={12} /> {fecha(p.proximo_ajuste)}
                      </>
                    ) : p.atrasado ? (
                      <>
                        <AlertTriangle size={12} /> Sin cita — llamarle
                      </>
                    ) : (
                      "Sin agendar"
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-[#a49c8a]">
                Pagado {formatearDinero(p.pagado)} de {formatearDinero(p.esperado)} esperado a la fecha
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
