"use client";

import { useState } from "react";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import type { Cita, Consentimiento, Paciente, PacienteNota, Pago, Presupuesto, Receta } from "@/lib/types";
import { calcularEdad } from "@/lib/fechas";
import { formatearDinero } from "@/lib/dinero";

export type TabFicha = "resumen" | "clinico" | "trat" | "docs" | "citas" | "datos" | "lealtad";

export const TABS: { id: TabFicha; etiqueta: string }[] = [
  { id: "datos", etiqueta: "Datos" },
  { id: "docs", etiqueta: "Documentos" },
  { id: "clinico", etiqueta: "Estado clínico" },
  { id: "trat", etiqueta: "Tratamiento" },
  { id: "citas", etiqueta: "Citas y pagos" },
  { id: "resumen", etiqueta: "Resumen" },
  { id: "lealtad", etiqueta: "Tarjeta de lealtad" },
];

const tarjeta = "rounded-3xl border border-[#EFE9DC] bg-white/70 p-5";
const titulo = "text-[11px] font-bold uppercase tracking-wide text-[#8a8272]";

function dia(f: string) {
  const d = new Date(f);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
function diaHora(f: string) {
  const d = new Date(f);
  return `${d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })} · ${d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;
}

export function calcularSaldo(citas: Cita[]) {
  const pendientes = citas.filter((c) => c.estado !== "cancelada" && (c.monto ?? 0) > (c.pagado ?? 0));
  return {
    saldo: pendientes.reduce((s, c) => s + ((c.monto ?? 0) - (c.pagado ?? 0)), 0),
    citasPendientes: pendientes,
  };
}

function ocultarTel(t: string) {
  const d = t.replace(/\D/g, "");
  return d.length > 4 ? `${"•".repeat(d.length - 4)}${d.slice(-4)}` : "••••";
}
function ocultarCorreo(c: string) {
  const [u, dom] = c.split("@");
  return dom ? `${u.slice(0, 1)}•••@${dom}` : "••••••";
}

export function Encabezado({ paciente, citas }: { paciente: Paciente; citas: Cita[] }) {
  const ahora = new Date().getTime();
  const proxima = citas
    .filter((c) => c.estado === "agendada" && new Date(c.fecha_hora).getTime() >= ahora)
    .sort((a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora))[0];
  const [oculto, setOculto] = useState(() => {
    try { return typeof window !== "undefined" && localStorage.getItem("ficha_contacto_oculto") === "1"; } catch { return false; }
  });
  function alternar() {
    setOculto((v) => {
      try { localStorage.setItem("ficha_contacto_oculto", v ? "0" : "1"); } catch {}
      return !v;
    });
  }
  const edad = paciente.fecha_nacimiento ? calcularEdad(paciente.fecha_nacimiento) : null;
  const alergia = paciente.alergias ? (paciente.alergias_cual?.trim() ? `Alergia: ${paciente.alergias_cual}` : "Con alergias registradas") : null;
  return (
    <div className={`${tarjeta} space-y-3`}>
      <div>
        <h2 className="text-[21px] font-bold leading-tight text-[#2b2118]" style={{ fontFamily: "Georgia, serif" }}>
          {paciente.nombre}
        </h2>
        <div className="mt-0.5 text-[13px] text-[#8a8272]">
          {[paciente.folio, edad !== null ? `${edad} años` : null].filter(Boolean).join(" · ")}
        </div>
      </div>
      {alergia && (
        <div className="flex items-center gap-2 rounded-xl border border-[#E8D8A0] bg-[#FCF3DC] px-3 py-2 text-[13px] font-semibold text-[#7a5410]">
          <AlertTriangle size={16} className="shrink-0" /> {alergia}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-[#FBF9F5] px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8a8272]">Próxima cita</div>
          {proxima ? (
            <>
              <div className="mt-0.5 text-[14px] font-semibold text-[#2b2118]">{diaHora(proxima.fecha_hora)}</div>
              <div className="text-xs text-[#8a8272]">{proxima.tratamiento}</div>
            </>
          ) : (
            <div className="mt-0.5 text-[14px] text-[#a49c8a]">Sin cita agendada</div>
          )}
        </div>
        <div className="min-w-0 rounded-2xl bg-[#FBF9F5] px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8a8272]">Contacto</div>
            <button onClick={alternar} aria-label={oculto ? "Mostrar contacto" : "Ocultar contacto"} className="text-[#8a8272]">
              {oculto ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="mt-0.5 truncate text-[13px] font-semibold text-[#2b2118]">
            {paciente.telefono ? (oculto ? ocultarTel(paciente.telefono) : paciente.telefono) : <span className="font-normal text-[#a49c8a]">Sin celular</span>}
          </div>
          <div className="truncate text-xs text-[#8a8272]">
            {paciente.email ? (oculto ? ocultarCorreo(paciente.email) : paciente.email) : "Sin correo"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BarraPestanas({ tab, setTab }: { tab: TabFicha; setTab: (t: TabFicha) => void }) {
  return (
    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="tablist">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => setTab(t.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold ${
            tab === t.id ? "bg-[#7A1E33] text-white" : "border border-[#EFE9DC] bg-white text-[#6f6458]"
          }`}
        >
          {t.etiqueta}
        </button>
      ))}
    </div>
  );
}

interface Evento {
  fecha: string;
  color: string;
  titulo: string;
  detalle?: string;
}

export function Resumen({
  paciente, citas, pagos, recetas, presupuestos, consentimientos, notas, irA, historialPendiente,
}: {
  paciente: Paciente;
  citas: Cita[];
  pagos: Pago[];
  recetas: Receta[];
  presupuestos: Presupuesto[];
  consentimientos: Consentimiento[];
  notas: PacienteNota[];
  irA: (t: TabFicha) => void;
  historialPendiente: boolean;
}) {
  const { citasPendientes } = calcularSaldo(citas.filter((c) => c.estado === "completada"));
  const eventos: Evento[] = [];
  for (const c of citas) if (c.estado === "completada") eventos.push({ fecha: c.fecha_hora, color: "#7A1E33", titulo: "Cita completada", detalle: c.tratamiento });
  for (const p of pagos) eventos.push({ fecha: p.fecha, color: "#3F6B33", titulo: `Pago de ${formatearDinero(p.monto)}`, detalle: p.metodo });
  for (const r of recetas) if (r.vigente) eventos.push({ fecha: r.creado_en, color: "#7A4D8A", titulo: "Receta", detalle: r.medicamentos.split("\n")[0] });
  for (const pr of presupuestos) eventos.push({ fecha: pr.creado_en, color: "#B08419", titulo: `Presupuesto${pr.estado ? ` · ${pr.estado}` : ""}`, detalle: pr.titulo });
  for (const co of consentimientos) if (co.vigente) eventos.push({ fecha: co.firmado_en ?? co.creado_en, color: "#4A5A70", titulo: co.firmado_en ? "Consentimiento firmado" : "Consentimiento enviado", detalle: co.titulo });
  for (const n of notas) eventos.push({ fecha: n.subido_en, color: "#8a8272", titulo: "Nota", detalle: undefined });
  eventos.push({ fecha: paciente.creado_en, color: "#8a8272", titulo: "Alta del paciente" });
  eventos.sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha));

  const alertas: { texto: string; accion: string; tab: TabFicha; tono: string }[] = [];
  if (historialPendiente) alertas.push({ texto: "Historial clínico sin confirmar", accion: "Revisar", tab: "datos", tono: "bg-[#F7E5E0] text-[#8f3b28]" });
  for (const c of citasPendientes.slice(0, 3))
    alertas.push({ texto: `Pago pendiente de la cita del ${dia(c.fecha_hora)}`, accion: "Cobrar", tab: "citas", tono: "bg-[#FCF3DC] text-[#7a5410]" });

  return (
    <div className="space-y-4">
      {alertas.length > 0 && (
        <div className={`${tarjeta} space-y-2`}>
          <div className={titulo}>Requiere atención</div>
          {alertas.map((a, i) => (
            <button key={i} onClick={() => irA(a.tab)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold ${a.tono}`}>
              <span>{a.texto}</span>
              <span className="font-bold underline">{a.accion}</span>
            </button>
          ))}
        </div>
      )}
      <div className={tarjeta}>
        <div className={`${titulo} mb-2`}>Línea del tiempo</div>
        {eventos.slice(0, 25).map((e, i) => (
          <div key={i} className="flex gap-3 border-t border-[#F1ECE0] py-2.5 first:border-t-0">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[#2b2118]">{e.titulo}</div>
              {e.detalle && <div className="truncate text-xs text-[#8a8272]">{e.detalle}</div>}
            </div>
            <div className="shrink-0 text-xs text-[#8a8272]">{dia(e.fecha)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ESTADO: Record<string, string> = {
  agendada: "bg-[#F5E7E9] text-[#803449]",
  completada: "bg-[#EEF4EA] text-[#2f5226]",
  cancelada: "bg-[#EEE9DC] text-[#6f6458]",
};

export function CitasPagos({ citas, pagos }: { citas: Cita[]; pagos: Pago[] }) {
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const { saldo, citasPendientes } = calcularSaldo(citas);
  const citaDe = (id: number) => citas.find((c) => c.id === id);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-3xl border border-[#EFE9DC] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8a8272]">Total pagado</div>
          <div className="text-[22px] font-bold text-[#2f5226]">{formatearDinero(totalPagado)}</div>
          <div className="text-xs text-[#8a8272]">en {pagos.length} pago{pagos.length === 1 ? "" : "s"}</div>
        </div>
        <div className={`rounded-3xl border p-4 ${saldo > 0 ? "border-[#EABDB0] bg-[#FBEAE8] text-[#8f3b28]" : "border-[#EFE9DC] bg-white text-[#2f5226]"}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wide">Saldo pendiente</div>
          <div className="text-[22px] font-bold">{formatearDinero(saldo)}</div>
          <div className="text-xs">{citasPendientes.length} cita{citasPendientes.length === 1 ? "" : "s"} sin liquidar</div>
        </div>
      </div>
      <div className={tarjeta}>
        <div className={`${titulo} mb-2`}>Citas</div>
        {citas.length === 0 && <p className="text-sm text-[#a49c8a]">Sin citas todavía.</p>}
        {citas.map((c) => (
          <div key={c.id} className="space-y-1 border-t border-[#F1ECE0] py-2.5 first:border-t-0">
            <div className="flex items-start justify-between gap-2">
              <b className="text-sm text-[#2b2118]">{diaHora(c.fecha_hora)}</b>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${ESTADO[c.estado] ?? ""}`}>{c.estado}</span>
            </div>
            <div className="text-xs text-[#8a8272]">
              {c.tratamiento}
              {c.monto ? ` · ${formatearDinero(c.pagado)} de ${formatearDinero(c.monto)}` : ""}
            </div>
          </div>
        ))}
      </div>
      <div className={tarjeta}>
        <div className={`${titulo} mb-2`}>Pagos</div>
        {pagos.length === 0 && <p className="text-sm text-[#a49c8a]">Sin pagos registrados.</p>}
        {pagos.map((p) => (
          <div key={p.id} className="flex justify-between gap-2 border-t border-[#F1ECE0] py-2.5 first:border-t-0">
            <div>
              <div className="text-sm font-semibold capitalize text-[#2b2118]">{dia(p.fecha)} · {p.metodo}</div>
              <div className="text-xs text-[#8a8272]">{citaDe(p.cita_id)?.tratamiento ?? p.nota ?? ""}</div>
            </div>
            <b className="shrink-0 text-sm">{formatearDinero(p.monto)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
