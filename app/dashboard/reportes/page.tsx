"use client";

import { useEffect, useState } from "react";
import { FileDown, TrendingUp, Users, XCircle, Wallet } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { formatearDinero } from "@/lib/dinero";

interface ReportesData {
  ingresos_por_mes: { mes: string; total: number }[];
  pacientes_nuevos_por_mes: { mes: string; total: number }[];
  citas_por_estado: { agendada: number; completada: number; cancelada: number };
  ingresos_por_tratamiento: { tratamiento: string; total: number }[];
  ingresos_totales_6m: number;
  pacientes_nuevos_6m: number;
  tasa_cancelacion_6m: number;
}

const COLOR_ROSA = "#803449";
const COLOR_VERDE = "#2F8F6F";
const COLOR_ESTADO = {
  agendada: "#803449",
  completada: "#2F8F6F",
  cancelada: "#C97A1E",
};

function etiquetaMes(mes: string) {
  const [anio, m] = mes.split("-").map(Number);
  return new Date(anio, m - 1, 1).toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
}

function BarrasVerticales({ datos, color, formato }: { datos: { mes: string; total: number }[]; color: string; formato: (n: number) => string }) {
  const max = Math.max(1, ...datos.map((d) => d.total));
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
      {datos.map((d) => {
        const alturaPct = Math.max(2, (d.total / max) * 100);
        return (
          <div key={d.mes} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="text-[9px] font-semibold text-[#2b2118]">{d.total > 0 ? formato(d.total) : ""}</div>
            <div className="flex w-full items-end justify-center" style={{ height: 92 }}>
              <div
                className="w-full max-w-[26px] rounded-t-md transition-all"
                style={{ height: `${alturaPct}%`, backgroundColor: color, minHeight: 2 }}
              />
            </div>
            <div className="text-[10px] capitalize text-[#a49c8a]">{etiquetaMes(d.mes)}</div>
          </div>
        );
      })}
    </div>
  );
}

function BarraHorizontal({
  etiqueta,
  valor,
  max,
  color,
  formato,
}: {
  etiqueta: string;
  valor: number;
  max: number;
  color: string;
  formato: (n: number) => string;
}) {
  const anchoPct = Math.max(2, (valor / max) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="truncate pr-2 font-medium capitalize text-[#2b2118]">{etiqueta}</span>
        <span className="shrink-0 font-semibold text-[#2b2118]">{formato(valor)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EFE9DC]">
        <div className="h-full rounded-full transition-all" style={{ width: `${anchoPct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function ReportesPage() {
  const [datos, setDatos] = useState<ReportesData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/reportes/resumen")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `error ${res.status}`);
        return res.json();
      })
      .then((data) => setDatos(data.reportes))
      .catch((err) => setError(err.message || "No se pudieron cargar los reportes"));
  }, []);

  const enteros = (n: number) => String(Math.round(n));
  const dinero = (n: number) => formatearDinero(n);

  return (
    <div className="mx-4 mt-2 space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#2b2118]" style={{ fontFamily: "Georgia, serif" }}>
          Reportes
        </h2>
        <a
          href="/api/reportes/resumen/pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2b2118]"
        >
          <FileDown size={13} /> Descargar PDF
        </a>
      </div>
      <p className="text-[13px] text-[#8a8272]">Últimos 6 meses.</p>

      {error && (
        <div className="rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]">
          {error}
        </div>
      )}

      {!datos && !error ? (
        <p className="text-sm text-[#8a8272]">Cargando…</p>
      ) : datos ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Wallet} iconBg="bg-[#F7E5E0] text-[#B0503A]" label="Ingresos (6m)" value={dinero(datos.ingresos_totales_6m)} />
            <StatCard icon={Users} iconBg="bg-[#E8F0E3] text-[#3F6B33]" label="Pacientes nuevos" value={datos.pacientes_nuevos_6m} />
            <StatCard
              icon={XCircle}
              iconBg="bg-[#FCEFD2] text-[#B08419]"
              label="Tasa de cancelación"
              value={`${datos.tasa_cancelacion_6m.toFixed(0)}%`}
            />
            <StatCard
              icon={TrendingUp}
              iconBg="bg-[#EFE3F0] text-[#7A4D8A]"
              label="Citas completadas"
              value={datos.citas_por_estado.completada}
            />
          </div>

          <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
              Ingresos por mes
            </div>
            <BarrasVerticales datos={datos.ingresos_por_mes} color={COLOR_ROSA} formato={dinero} />
          </div>

          <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
              Pacientes nuevos por mes
            </div>
            <BarrasVerticales datos={datos.pacientes_nuevos_por_mes} color={COLOR_VERDE} formato={enteros} />
          </div>

          <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
              Citas por estado
            </div>
            <div className="space-y-3">
              {(["agendada", "completada", "cancelada"] as const).map((estado) => (
                <BarraHorizontal
                  key={estado}
                  etiqueta={estado}
                  valor={datos.citas_por_estado[estado]}
                  max={Math.max(1, datos.citas_por_estado.agendada, datos.citas_por_estado.completada, datos.citas_por_estado.cancelada)}
                  color={COLOR_ESTADO[estado]}
                  formato={enteros}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
              Ingresos por tratamiento
            </div>
            {datos.ingresos_por_tratamiento.length === 0 ? (
              <p className="text-sm text-[#a49c8a]">Sin pagos registrados en este periodo.</p>
            ) : (
              <div className="space-y-3">
                {datos.ingresos_por_tratamiento.map((t) => (
                  <BarraHorizontal
                    key={t.tratamiento}
                    etiqueta={t.tratamiento}
                    valor={t.total}
                    max={Math.max(1, ...datos.ingresos_por_tratamiento.map((r) => r.total))}
                    color={COLOR_ROSA}
                    formato={dinero}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
