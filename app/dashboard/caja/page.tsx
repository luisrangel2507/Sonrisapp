"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Banknote, CreditCard, ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { formatearDinero } from "@/lib/dinero";

interface DatosCaja {
  pagos: { id: number; monto: number; metodo: string; fecha: string; paciente_id: number; paciente_nombre: string; tratamiento: string | null }[];
  porMetodo: Record<string, number>;
  total: number;
  saldos: { paciente_id: number; paciente_nombre: string; telefono: string | null; cobrado: number; pagado: number; saldo: number }[];
  totalPorCobrar: number;
}

function claveLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const METODOS = [
  { clave: "efectivo", label: "Efectivo", icon: Banknote },
  { clave: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { clave: "transferencia", label: "Transferencia", icon: ArrowLeftRight },
] as const;

type Periodo = "dia" | "semana" | "mes" | "rango";

const PERIODOS: { clave: Periodo; label: string }[] = [
  { clave: "dia", label: "Día" },
  { clave: "semana", label: "Semana" },
  { clave: "mes", label: "Mes" },
  { clave: "rango", label: "Fechas" },
];

// Desde–hasta del periodo que contiene `ref` (la semana va de lunes a domingo).
function rangoDe(periodo: Periodo, ref: Date): [Date, Date] {
  if (periodo === "semana") {
    const lunes = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ((ref.getDay() + 6) % 7));
    return [lunes, new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6)];
  }
  if (periodo === "mes") return [new Date(ref.getFullYear(), ref.getMonth(), 1), new Date(ref.getFullYear(), ref.getMonth() + 1, 0)];
  return [ref, ref];
}

const corta = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });

export default function CajaPage() {
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [ref, setRef] = useState(() => new Date());
  const [desdeRango, setDesdeRango] = useState(() => claveLocal(new Date()));
  const [hastaRango, setHastaRango] = useState(() => claveLocal(new Date()));
  const [datos, setDatos] = useState<DatosCaja | null>(null);

  const [ini, fin] = rangoDe(periodo, ref);
  const desde = periodo === "rango" ? desdeRango : claveLocal(ini);
  const hasta = periodo === "rango" ? (hastaRango < desdeRango ? desdeRango : hastaRango) : claveLocal(fin);
  const variosDias = desde !== hasta;

  useEffect(() => {
    let activo = true;
    fetch(`/api/caja?desde=${desde}&hasta=${hasta}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => activo && setDatos(d))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [desde, hasta]);

  const hoy = claveLocal(new Date());
  const enPresente = hasta >= hoy;
  const mover = (delta: number) =>
    setRef((d) =>
      periodo === "mes"
        ? new Date(d.getFullYear(), d.getMonth() + delta, 1)
        : new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta * (periodo === "semana" ? 7 : 1))
    );

  const titulo =
    periodo === "dia"
      ? desde === hoy
        ? "Hoy"
        : ini.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
      : periodo === "semana"
        ? `${corta(ini)} – ${corta(fin)}`
        : periodo === "mes"
          ? ini.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
          : "Rango de fechas";
  const etiqueta = periodo === "dia" ? "Corte del día" : periodo === "semana" ? "Corte de la semana" : periodo === "mes" ? "Corte del mes" : "Corte por fechas";

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 md:px-0">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-[#2b2118]">
        <Wallet size={22} className="text-[#7A1E33]" /> Caja
      </h1>

      <div className="flex rounded-full border border-[#EFE9DC] bg-white p-1">
        {PERIODOS.map((p) => (
          <button
            key={p.clave}
            onClick={() => {
              setPeriodo(p.clave);
              setRef(new Date());
            }}
            className={`flex-1 rounded-full py-1.5 text-[13px] font-semibold ${periodo === p.clave ? "btn-vino" : "text-[#6f6458]"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 shadow-sm">
        {periodo === "rango" ? (
          <div>
            <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">{etiqueta}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-[11px] font-medium text-[#a49c8a]">
                Desde
                <input
                  type="date"
                  value={desdeRango}
                  max={hoy}
                  onChange={(e) => e.target.value && setDesdeRango(e.target.value)}
                  className="mt-1 block w-full min-w-0 max-w-full appearance-none rounded-xl border border-[#EFE9DC] bg-white px-2 py-2 text-sm text-[#2b2118] outline-none focus:border-[#803449]"
                />
              </label>
              <label className="text-[11px] font-medium text-[#a49c8a]">
                Hasta
                <input
                  type="date"
                  value={hastaRango}
                  min={desdeRango}
                  max={hoy}
                  onChange={(e) => e.target.value && setHastaRango(e.target.value)}
                  className="mt-1 block w-full min-w-0 max-w-full appearance-none rounded-xl border border-[#EFE9DC] bg-white px-2 py-2 text-sm text-[#2b2118] outline-none focus:border-[#803449]"
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button onClick={() => mover(-1)} className="rounded-full p-1.5 text-[#8a8272]" aria-label="Anterior">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">{etiqueta}</div>
              <div className="font-serif text-lg font-semibold capitalize text-[#2b2118]">{titulo}</div>
            </div>
            <button
              onClick={() => mover(1)}
              disabled={enPresente}
              className="rounded-full p-1.5 text-[#8a8272] disabled:opacity-30"
              aria-label="Siguiente"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        <div className="mt-4 text-center">
          <div className="text-[12px] text-[#a49c8a]">Total cobrado</div>
          <div className="text-3xl font-bold text-[#3F6B33]">{formatearDinero(datos?.total ?? 0)}</div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {METODOS.map(({ clave: m, label, icon: Icono }) => (
            <div key={m} className="rounded-2xl border border-[#EFE9DC] bg-white p-3 text-center">
              <Icono size={16} className="mx-auto text-[#7A1E33]" />
              <div className="mt-1 text-[11px] text-[#a49c8a]">{label}</div>
              <div className="text-sm font-semibold text-[#2b2118]">{formatearDinero(datos?.porMetodo[m] ?? 0)}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1.5">
          {(datos?.pagos ?? []).length === 0 ? (
            <p className="py-3 text-center text-sm text-[#a49c8a]">Sin pagos en este periodo.</p>
          ) : (
            datos!.pagos.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 border-b border-[#EFE9DC] py-2 text-sm last:border-0">
                <div className="min-w-0">
                  <Link href={`/dashboard/pacientes/${p.paciente_id}`} className="block truncate font-medium text-[#2b2118]">
                    {p.paciente_nombre}
                  </Link>
                  <div className="text-[11px] text-[#a49c8a]">
                    {variosDias ? `${corta(new Date(p.fecha))}, ` : ""}
                    {new Date(p.fecha).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })} · {p.metodo}
                    {p.tratamiento ? ` · ${p.tratamiento}` : ""}
                  </div>
                </div>
                <div className="shrink-0 font-semibold text-[#2b2118]">{formatearDinero(p.monto)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">Saldos pendientes</div>
          <div className="text-sm font-semibold text-[#B0503A]">{formatearDinero(datos?.totalPorCobrar ?? 0)}</div>
        </div>
        <div className="mt-3 space-y-1.5">
          {(datos?.saldos ?? []).length === 0 ? (
            <p className="py-3 text-center text-sm text-[#a49c8a]">Nadie debe nada. 🎉</p>
          ) : (
            datos!.saldos.map((s) => (
              <Link
                key={s.paciente_id}
                href={`/dashboard/pacientes/${s.paciente_id}`}
                className="flex items-center justify-between gap-2 border-b border-[#EFE9DC] py-2 text-sm last:border-0"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-[#2b2118]">{s.paciente_nombre}</div>
                  <div className="text-[11px] text-[#a49c8a]">
                    Pagó {formatearDinero(s.pagado)} de {formatearDinero(s.cobrado)}
                  </div>
                </div>
                <div className="shrink-0 font-semibold text-[#B0503A]">{formatearDinero(s.saldo)}</div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
