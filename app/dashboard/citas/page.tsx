"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Check,
  X,
  DollarSign,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
  AlertTriangle,
  FileDown,
  Share2,
  Lock,
} from "lucide-react";
import type { Cita, Paciente } from "@/lib/types";
import { formatearDinero } from "@/lib/dinero";
import { citaVencidaSinCompletar } from "@/lib/fechas";
import { pagoConfirmado } from "@/lib/citas";
import { TRATAMIENTOS } from "@/lib/panel-data";

const NUEVO_PACIENTE = "__nuevo__";

const ESTADO_ESTILO: Record<Cita["estado"], string> = {
  agendada: "bg-[#F7E5E0] text-[#B0503A]",
  completada: "bg-[#E8F0E3] text-[#3F6B33]",
  cancelada: "bg-[#EFE9DC] text-[#a49c8a]",
};

const ESTADO_COLOR_NODO: Record<Cita["estado"], string> = {
  agendada: "#803449",
  completada: "#3F6B33",
  cancelada: "#a49c8a",
};

const DIAS_SEMANA_CORTO = ["D", "L", "M", "M", "J", "V", "S"];

// Domingo — la clínica no abre (ver CLINICA.horario en lib/panel-data.ts).
const DIA_NO_LABORAL = 0;

type Vista = "dia" | "semana" | "mes";

function formatearHora(fechaHora: string) {
  return new Date(fechaHora).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
}

function claveDia(fecha: string | Date) {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inicioDelDia(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function inicioDeSemana(d: Date) {
  const s = inicioDelDia(d);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

function aDatetimeLocal(fecha: string) {
  const d = new Date(fecha);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  const primera = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primera + ultima).toUpperCase();
}

function SelectorVista({ vista, onCambiar }: { vista: Vista; onCambiar: (v: Vista) => void }) {
  return (
    <div className="flex rounded-full border border-[#EFE9DC] bg-white p-0.5 text-[12px]">
      {(
        [
          ["dia", "Día"],
          ["semana", "Semana"],
          ["mes", "Mes"],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          onClick={() => onCambiar(v)}
          className={`flex-1 rounded-full px-3 py-1.5 font-semibold transition-colors ${
            vista === v ? "bg-[#2b2118] text-white" : "text-[#8a8272]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SelectorSemana({
  diaSeleccionado,
  citasPorDia,
  onCambiarAncla,
  onSeleccionarDia,
}: {
  diaSeleccionado: Date;
  citasPorDia: Record<string, number>;
  onCambiarAncla: (d: Date) => void;
  onSeleccionarDia: (d: Date) => void;
}) {
  const inicioSemana = useMemo(() => inicioDeSemana(diaSeleccionado), [diaSeleccionado]);

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + i)),
    [inicioSemana]
  );

  const hoyClave = claveDia(new Date());
  const claveSeleccionado = claveDia(diaSeleccionado);

  function moverSemana(delta: number) {
    onCambiarAncla(new Date(diaSeleccionado.getFullYear(), diaSeleccionado.getMonth(), diaSeleccionado.getDate() + delta * 7));
  }

  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <button
          onClick={() => moverSemana(-1)}
          className="rounded-full p-1.5 text-[#8a8272] hover:bg-[#EFE9DC]/70"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => onCambiarAncla(inicioDelDia(new Date()))}
          className="text-[16px] font-bold capitalize text-[#2b2118]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {diaSeleccionado.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
        </button>
        <button
          onClick={() => moverSemana(1)}
          className="rounded-full p-1.5 text-[#8a8272] hover:bg-[#EFE9DC]/70"
          aria-label="Semana siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {dias.map((d) => {
          const clave = claveDia(d);
          const seleccionado = clave === claveSeleccionado;
          const esHoy = clave === hoyClave;
          const noLaboral = d.getDay() === DIA_NO_LABORAL;
          const numCitas = citasPorDia[clave] ?? 0;
          return (
            <button
              key={clave}
              onClick={() => onSeleccionarDia(d)}
              className="flex flex-col items-center gap-1 rounded-2xl py-1.5"
            >
              <span className={`text-[10px] font-medium uppercase ${noLaboral ? "text-[#c9c2b3]" : "text-[#a49c8a]"}`}>
                {d.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "")}
              </span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold transition-colors ${
                  seleccionado
                    ? "bg-[#2b2118] text-white"
                    : esHoy
                      ? "border border-[#803449] text-[#2b2118]"
                      : noLaboral
                        ? "text-[#c9c2b3]"
                        : "text-[#2b2118] hover:bg-[#EFE9DC]/70"
                }`}
              >
                {d.getDate()}
              </span>
              <span
                className="h-1 w-1 rounded-full"
                style={{ backgroundColor: numCitas > 0 ? "#803449" : "transparent" }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectorMes({
  ancla,
  citasPorDia,
  onSeleccionarDia,
}: {
  ancla: Date;
  citasPorDia: Record<string, number>;
  onSeleccionarDia: (d: Date) => void;
}) {
  const [mesVista, setMesVista] = useState(() => new Date(ancla.getFullYear(), ancla.getMonth(), 1));

  const dias = useMemo(() => {
    const primerDia = new Date(mesVista.getFullYear(), mesVista.getMonth(), 1);
    const ultimoDia = new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 0);
    const lista: (Date | null)[] = [];
    for (let i = 0; i < primerDia.getDay(); i++) lista.push(null);
    for (let d = 1; d <= ultimoDia.getDate(); d++) lista.push(new Date(mesVista.getFullYear(), mesVista.getMonth(), d));
    return lista;
  }, [mesVista]);

  const hoyClave = claveDia(new Date());

  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMesVista(new Date(mesVista.getFullYear(), mesVista.getMonth() - 1, 1))}
          className="rounded-full p-1.5 text-[#8a8272] hover:bg-[#EFE9DC]/70"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-[16px] font-bold capitalize text-[#2b2118]" style={{ fontFamily: "Georgia, serif" }}>
          {mesVista.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
        </div>
        <button
          onClick={() => setMesVista(new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 1))}
          className="rounded-full p-1.5 text-[#8a8272] hover:bg-[#EFE9DC]/70"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[#a49c8a]">
        {DIAS_SEMANA_CORTO.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {dias.map((fecha, i) => {
          if (!fecha) return <div key={i} />;
          const clave = claveDia(fecha);
          const numCitas = citasPorDia[clave] ?? 0;
          const noLaboral = fecha.getDay() === DIA_NO_LABORAL;
          const esHoy = clave === hoyClave;
          return (
            <button
              key={i}
              onClick={() => onSeleccionarDia(fecha)}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[12px] font-medium ${
                noLaboral
                  ? "text-[#c9c2b3]"
                  : esHoy
                    ? "border border-[#803449] text-[#2b2118]"
                    : "text-[#2b2118] hover:bg-[#EFE9DC]/70"
              }`}
            >
              {fecha.getDate()}
              <span
                className="h-1 w-1 rounded-full"
                style={{ backgroundColor: numCitas > 0 ? "#803449" : "transparent" }}
              />
            </button>
          );
        })}
      </div>

      <p className="mt-3 border-t border-[#EFE9DC] pt-3 text-center text-[11px] text-[#a49c8a]">
        Toca un día para ver sus citas
      </p>
    </div>
  );
}

function CitaTimelineItem({
  cita,
  esUltimo,
  editando,
  editTratamiento,
  setEditTratamiento,
  editFechaHora,
  setEditFechaHora,
  editMonto,
  setEditMonto,
  guardandoEdicion,
  onAbrirEdicion,
  onCerrarEdicion,
  onGuardarEdicion,
  pagando,
  completarTrasPago,
  montoPago,
  setMontoPago,
  metodoPago,
  setMetodoPago,
  guardandoPago,
  onAbrirPago,
  onCerrarPago,
  onGuardarPago,
  deshaciendoPago,
  onCambiarEstado,
  onCompletar,
  onDeshacerPago,
}: {
  cita: Cita;
  esUltimo: boolean;
  editando: boolean;
  editTratamiento: string;
  setEditTratamiento: (v: string) => void;
  editFechaHora: string;
  setEditFechaHora: (v: string) => void;
  editMonto: string;
  setEditMonto: (v: string) => void;
  guardandoEdicion: boolean;
  onAbrirEdicion: () => void;
  onCerrarEdicion: () => void;
  onGuardarEdicion: () => void;
  pagando: boolean;
  completarTrasPago: boolean;
  montoPago: string;
  setMontoPago: (v: string) => void;
  metodoPago: string;
  setMetodoPago: (v: string) => void;
  guardandoPago: boolean;
  onAbrirPago: () => void;
  onCerrarPago: () => void;
  onGuardarPago: () => void;
  deshaciendoPago: boolean;
  onCambiarEstado: (estado: "completada" | "cancelada") => void;
  onCompletar: () => void;
  onDeshacerPago: () => void;
}) {
  const restante = cita.monto != null ? Math.max(0, cita.monto - cita.pagado) : null;
  const progresoPago = cita.monto ? Math.min(100, (cita.pagado / cita.monto) * 100) : 0;
  const vencida = citaVencidaSinCompletar(cita);
  // Una vez que el tratamiento está completado Y el pago quedó
  // confirmado (todo cobrado), la cita se congela: ya no se puede
  // editar ni deshacer el pago desde aquí.
  const confirmada = cita.estado === "completada" && pagoConfirmado(cita);
  const [enviandoRecibo, setEnviandoRecibo] = useState(false);

  // Comparte el PDF del recibo directamente (WhatsApp, Mail, etc.) vía
  // el share sheet nativo del celular — si el navegador no soporta
  // compartir archivos, cae a abrirlo en una pestaña para que se
  // comparta a mano desde ahí.
  async function enviarRecibo() {
    if (enviandoRecibo) return;
    setEnviandoRecibo(true);
    try {
      const res = await fetch(`/api/citas/${cita.id}/recibo`);
      const blob = await res.blob();
      const archivo = new File([blob], `recibo-${cita.paciente_nombre.replace(/\s+/g, "-")}.pdf`, {
        type: "application/pdf",
      });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        await navigator.share({
          files: [archivo],
          title: "Recibo de pago",
          text: `Recibo de pago de ${cita.paciente_nombre} — Viña Sonrisas`,
        });
      } else {
        window.open(`/api/citas/${cita.id}/recibo`, "_blank");
      }
    } catch {
      // el usuario canceló el share, no hacer nada
    } finally {
      setEnviandoRecibo(false);
    }
  }

  return (
    <div className={esUltimo ? "" : "pb-4"}>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ESTADO_COLOR_NODO[cita.estado] }} />
        <span className="text-[13px] font-semibold text-[#2b2118]">{formatearHora(cita.fecha_hora)}</span>
      </div>

      <div className="mt-2 rounded-2xl bg-[#FBF9F5] p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFE9DC] text-[12px] font-semibold text-[#2b2118]">
            {iniciales(cita.paciente_nombre)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug text-[#2b2118]">{cita.paciente_nombre}</div>
                <div className="text-xs text-[#a49c8a]">{cita.tratamiento}</div>
              </div>
              {vencida ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#B0503A] px-2.5 py-1 text-[11px] font-semibold text-white">
                  <AlertTriangle size={11} /> Vencida
                </span>
              ) : cita.estado === "completada" && !confirmada ? (
                <span className="shrink-0 whitespace-nowrap rounded-full bg-[#F7ECD9] px-2.5 py-1 text-[11px] font-semibold text-[#B0834A]">
                  Confirmación pendiente
                </span>
              ) : (
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${ESTADO_ESTILO[cita.estado]}`}>
                  {cita.estado}
                </span>
              )}
            </div>
          </div>
        </div>

        {cita.historial_pendiente && (
          <Link
            href={`/dashboard/pacientes/${cita.paciente_id}/historia-clinica`}
            className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-[#F7E5E0] px-3 py-2 text-[12px] font-semibold text-[#B0503A]"
          >
            🚨 Historial sin confirmar — tócalo para revisarlo
          </Link>
        )}

        {cita.monto != null && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-xs text-[#8a8272]">
              <span>
                {formatearDinero(cita.pagado)} de {formatearDinero(cita.monto)}
              </span>
              {restante ? (
                <span className="font-semibold text-[#B0503A]">falta {formatearDinero(restante)}</span>
              ) : (
                <span className="font-semibold text-[#3F6B33]">pagado</span>
              )}
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#EFE9DC]">
              <div className="h-full rounded-full bg-[#3F6B33] transition-all" style={{ width: `${progresoPago}%` }} />
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto">
          {cita.estado === "agendada" && (
            <button
              onClick={onCompletar}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#E8F0E3] px-3 py-1.5 text-[12px] font-semibold text-[#3F6B33]"
            >
              <Check size={12} /> Completada
            </button>
          )}
          {/* Para una cita agendada, el pago se registra adentro del
              flujo de "Completada" (onCompletar ya abre el mismo
              formulario de pago) — un botón aparte aquí solo hacía
              parecer que había que hacer los dos pasos por separado.
              "Registrar pago" queda solo para una cita ya completada
              con confirmación de pago pendiente. */}
          {cita.estado === "completada" && restante !== null && restante > 0 && (
            <button
              onClick={() => (pagando ? onCerrarPago() : onAbrirPago())}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2b2118]"
            >
              <DollarSign size={12} /> Registrar pago
            </button>
          )}
          {!confirmada && (
            <button
              onClick={() => (editando ? onCerrarEdicion() : onAbrirEdicion())}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2b2118]"
            >
              <Pencil size={12} /> Editar
            </button>
          )}
          {cita.pagado > 0 && (
            <>
              <a
                href={`/api/citas/${cita.id}/recibo`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2b2118]"
              >
                <FileDown size={12} /> Recibo
              </a>
              <button
                onClick={enviarRecibo}
                disabled={enviandoRecibo}
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2b2118] disabled:opacity-50"
              >
                <Share2 size={12} /> {enviandoRecibo ? "Preparando…" : "Enviar recibo"}
              </button>
              {/* Deshacer sigue disponible aunque ya esté "confirmada" —
                  es la forma de corregir un pago marcado por error (ej.
                  se confirmó sin querer con el saldo completo). Lo que
                  queda bloqueado es editar tratamiento/fecha/monto. */}
              <button
                onClick={onDeshacerPago}
                disabled={deshaciendoPago}
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#B0503A] disabled:opacity-50"
              >
                <RotateCcw size={12} /> {deshaciendoPago ? "Deshaciendo…" : "No se pagó, deshacer"}
              </button>
            </>
          )}
          {confirmada && (
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] text-[#a49c8a]">
              <Lock size={11} /> Pago confirmado — ya no se puede editar
            </span>
          )}
        </div>

        {editando && (
          <div className="mt-3 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
            <select
              value={editTratamiento}
              onChange={(e) => setEditTratamiento(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
            >
              {editTratamiento && !TRATAMIENTOS.includes(editTratamiento) && (
                <option value={editTratamiento}>{editTratamiento}</option>
              )}
              {TRATAMIENTOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#a49c8a]">Fecha</label>
              <input
                type="datetime-local"
                value={editFechaHora}
                onChange={(e) => setEditFechaHora(e.target.value)}
                className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
              />
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#a49c8a]">
                $
              </span>
              <input
                type="number"
                min="0"
                value={editMonto}
                onChange={(e) => setEditMonto(e.target.value)}
                placeholder="Monto"
                className="w-full rounded-xl border border-[#EFE9DC] py-2 pl-7 pr-3 text-sm outline-none focus:border-[#803449]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={onGuardarEdicion}
                disabled={!editTratamiento.trim() || !editFechaHora || guardandoEdicion}
                className="flex-1 rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {guardandoEdicion ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                onClick={onCerrarEdicion}
                className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]"
              >
                Cerrar
              </button>
            </div>
            {cita.estado === "agendada" && (
              <button
                onClick={() => onCambiarEstado("cancelada")}
                className="flex w-full items-center justify-center gap-1 rounded-full bg-[#F7E5E0] py-2 text-[13px] font-semibold text-[#B0503A]"
              >
                <X size={13} /> Cancelar cita
              </button>
            )}
          </div>
        )}

        {pagando && (
          <div className="mt-3 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
            {completarTrasPago && (
              <p className="text-[12px] font-medium text-[#3F6B33]">
                ¿Cómo pagó? La cita se marcará como completada al guardar.
              </p>
            )}
            <input
              type="number"
              min="0"
              value={montoPago}
              onChange={(e) => setMontoPago(e.target.value)}
              placeholder={`Monto (falta ${formatearDinero(restante ?? 0)})`}
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={onGuardarPago}
                disabled={guardandoPago}
                className="flex-1 rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {guardandoPago
                  ? "Guardando…"
                  : completarTrasPago
                    ? "Confirmar pago y completar"
                    : "Guardar pago"}
              </button>
              <button
                onClick={onCerrarPago}
                className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CitasPage() {
  const [citas, setCitas] = useState<Cita[] | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [precios, setPrecios] = useState<Record<string, number | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [pagoAbiertoId, setPagoAbiertoId] = useState<number | null>(null);
  // Cuando se abre el formulario de pago desde el botón "Completada"
  // (en vez de "Registrar pago"), guardar el pago también marca la
  // cita como completada — así no hace falta el paso extra.
  const [completarTrasPago, setCompletarTrasPago] = useState(false);

  const [pacienteId, setPacienteId] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [telefonoNuevo, setTelefonoNuevo] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [monto, setMonto] = useState("");
  const [montoTocado, setMontoTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [montoPago, setMontoPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [guardandoPago, setGuardandoPago] = useState(false);

  const [vista, setVista] = useState<Vista>("dia");
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => inicioDelDia(new Date()));

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editTratamiento, setEditTratamiento] = useState("");
  const [editFechaHora, setEditFechaHora] = useState("");
  const [editMonto, setEditMonto] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [deshaciendoPagoId, setDeshaciendoPagoId] = useState<number | null>(null);

  async function cargar() {
    try {
      const [resCitas, resPacientes, resPrecios] = await Promise.all([
        fetch("/api/citas"),
        fetch("/api/pacientes"),
        fetch("/api/precios-servicios"),
      ]);
      const dataCitas = await resCitas.json();
      const dataPacientes = await resPacientes.json();
      const dataPrecios = await resPrecios.json();
      if (!resCitas.ok) throw new Error(dataCitas.error || `error ${resCitas.status}`);
      if (!resPacientes.ok) throw new Error(dataPacientes.error || `error ${resPacientes.status}`);
      setCitas(dataCitas.citas ?? []);
      setPacientes(dataPacientes.pacientes ?? []);
      if (resPrecios.ok) {
        const mapa: Record<string, number | null> = {};
        for (const p of dataPrecios.precios ?? []) mapa[p.servicio] = p.precio;
        setPrecios(mapa);
      }
      setError(null);
    } catch (err) {
      setError(`No se pudo cargar la agenda: ${err instanceof Error ? err.message : "error desconocido"}`);
    }
  }

  useEffect(() => {
    cargar();
    const params = new URLSearchParams(window.location.search);
    if (params.get("nuevo") === "1") {
      setFormAbierto(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
    const ir = params.get("ir");
    if (ir) {
      const [y, m, d] = ir.split("-").map(Number);
      if (y && m && d) seleccionarDia(new Date(y, m - 1, d));
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function elegirTratamiento(valor: string) {
    setTratamiento(valor);
    const precio = precios[valor];
    if (!montoTocado && precio != null) setMonto(String(precio));
  }

  function resetForm() {
    setPacienteId("");
    setNombreNuevo("");
    setTelefonoNuevo("");
    setTratamiento("");
    setFechaHora("");
    setMonto("");
    setMontoTocado(false);
    setFormAbierto(false);
  }

  async function crearCita() {
    const esNuevo = pacienteId === NUEVO_PACIENTE;
    if (esNuevo ? !nombreNuevo.trim() : !pacienteId) return;
    if (!tratamiento.trim() || !fechaHora || guardando) return;

    setGuardando(true);

    let idFinal = pacienteId;
    if (esNuevo) {
      const resPaciente = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreNuevo, telefono: telefonoNuevo || null }),
      });
      const dataPaciente = await resPaciente.json();
      if (!resPaciente.ok || !dataPaciente.paciente?.id) {
        setError(`No se pudo dar de alta al paciente: ${dataPaciente.error || "error desconocido"}`);
        setGuardando(false);
        return;
      }
      idFinal = String(dataPaciente.paciente.id);
    }

    await fetch("/api/citas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paciente_id: Number(idFinal),
        tratamiento,
        fecha_hora: new Date(fechaHora).toISOString(),
        monto: monto ? Number(monto) : null,
      }),
    });

    if (fechaHora) {
      setDiaSeleccionado(inicioDelDia(new Date(fechaHora)));
      setVista("dia");
    }
    resetForm();
    setGuardando(false);
    await cargar();
  }

  async function cambiarEstado(id: number, estado: "completada" | "cancelada") {
    await fetch("/api/citas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado }),
    });
    await cargar();
  }

  function abrirEdicion(c: Cita) {
    setPagoAbiertoId(null);
    setEditandoId(c.id);
    setEditTratamiento(c.tratamiento);
    setEditFechaHora(aDatetimeLocal(c.fecha_hora));
    setEditMonto(c.monto != null ? String(c.monto) : "");
  }

  async function guardarEdicion() {
    if (!editandoId || !editTratamiento.trim() || !editFechaHora || guardandoEdicion) return;
    setGuardandoEdicion(true);
    await fetch("/api/citas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editandoId,
        tratamiento: editTratamiento,
        fecha_hora: new Date(editFechaHora).toISOString(),
        monto: editMonto ? Number(editMonto) : null,
      }),
    });
    setEditandoId(null);
    setGuardandoEdicion(false);
    await cargar();
  }

  async function registrarPago(cita: Cita) {
    const restante = (cita.monto ?? 0) - cita.pagado;
    const montoFinal = montoPago ? Number(montoPago) : restante;
    if (!montoFinal || montoFinal <= 0 || guardandoPago) return;
    setGuardandoPago(true);
    await fetch("/api/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cita_id: cita.id,
        paciente_id: cita.paciente_id,
        monto: montoFinal,
        metodo: metodoPago,
      }),
    });
    if (completarTrasPago) {
      await fetch("/api/citas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cita.id, estado: "completada" }),
      });
    }
    setPagoAbiertoId(null);
    setCompletarTrasPago(false);
    setMontoPago("");
    setMetodoPago("efectivo");
    setGuardandoPago(false);
    await cargar();
  }

  async function deshacerPago(cita: Cita) {
    if (deshaciendoPagoId) return;
    const ok = window.confirm(
      `¿Deshacer el último pago registrado de ${cita.paciente_nombre}? Esto no se puede recuperar.`
    );
    if (!ok) return;
    setDeshaciendoPagoId(cita.id);
    await fetch(`/api/pagos?cita_id=${cita.id}`, { method: "DELETE" });
    setDeshaciendoPagoId(null);
    await cargar();
  }

  function seleccionarDia(d: Date) {
    setDiaSeleccionado(d);
    setVista("dia");
  }

  const citasPorDia = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const c of citas ?? []) {
      const clave = claveDia(c.fecha_hora);
      mapa[clave] = (mapa[clave] ?? 0) + 1;
    }
    return mapa;
  }, [citas]);

  const citasDelDia = useMemo(() => {
    const clave = claveDia(diaSeleccionado);
    return (citas ?? [])
      .filter((c) => claveDia(c.fecha_hora) === clave)
      .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
  }, [citas, diaSeleccionado]);

  const citasVencidas = useMemo(
    () => (citas ?? []).filter(citaVencidaSinCompletar).sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora)),
    [citas]
  );

  const diasDeLaSemana = useMemo(() => {
    const inicio = inicioDeSemana(diaSeleccionado);
    return Array.from({ length: 7 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));
  }, [diaSeleccionado]);

  const citasDeLaSemana = useMemo(() => {
    const claves = new Set(diasDeLaSemana.map((d) => claveDia(d)));
    return (citas ?? [])
      .filter((c) => claves.has(claveDia(c.fecha_hora)))
      .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
  }, [citas, diasDeLaSemana]);

  const esNuevo = pacienteId === NUEVO_PACIENTE;
  const puedeAgendar = (esNuevo ? nombreNuevo.trim() : pacienteId) && tratamiento.trim() && fechaHora && !guardando;

  function propsTimelineItem(c: Cita) {
    return {
      cita: c,
      editando: editandoId === c.id,
      editTratamiento,
      setEditTratamiento,
      editFechaHora,
      setEditFechaHora,
      editMonto,
      setEditMonto,
      guardandoEdicion,
      onAbrirEdicion: () => abrirEdicion(c),
      onCerrarEdicion: () => setEditandoId(null),
      onGuardarEdicion: guardarEdicion,
      pagando: pagoAbiertoId === c.id,
      completarTrasPago: pagoAbiertoId === c.id && completarTrasPago,
      montoPago,
      setMontoPago,
      metodoPago,
      setMetodoPago,
      guardandoPago,
      onAbrirPago: () => {
        setEditandoId(null);
        setPagoAbiertoId(c.id);
        setCompletarTrasPago(false);
        const restante = c.monto != null ? Math.max(0, c.monto - c.pagado) : null;
        setMontoPago(restante != null ? String(restante) : "");
      },
      onCerrarPago: () => {
        setPagoAbiertoId(null);
        setCompletarTrasPago(false);
      },
      onGuardarPago: () => registrarPago(c),
      deshaciendoPago: deshaciendoPagoId === c.id,
      onCambiarEstado: (estado: "completada" | "cancelada") => cambiarEstado(c.id, estado),
      onCompletar: () => {
        const restante = c.monto != null ? Math.max(0, c.monto - c.pagado) : null;
        if (restante && restante > 0) {
          setEditandoId(null);
          setPagoAbiertoId(c.id);
          setCompletarTrasPago(true);
          setMontoPago(String(restante));
        } else {
          cambiarEstado(c.id, "completada");
        }
      },
      onDeshacerPago: () => deshacerPago(c),
    };
  }

  return (
    <div className="mx-4 mt-2 space-y-3 pb-6">
      {error && (
        <div className="rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]">
          {error}
        </div>
      )}
      {citasVencidas.length > 0 && (
        <button
          onClick={() => seleccionarDia(inicioDelDia(new Date(citasVencidas[0].fecha_hora)))}
          className="flex w-full items-start gap-2.5 rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-left text-[13px] text-[#B0503A]"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>
              {citasVencidas.length} cita{citasVencidas.length === 1 ? "" : "s"} sin marcar como completada
              {citasVencidas.length === 1 ? "" : "s"}
            </strong>{" "}
            — ya pasaron más de 2 horas. Tócalo para ir a la más antigua.
          </span>
        </button>
      )}
      {!formAbierto ? (
        <button
          onClick={() => setFormAbierto(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3 text-[14px] font-semibold text-white md:w-auto md:px-8"
        >
          <Plus size={15} /> Agendar cita
        </button>
      ) : (
        <div className="space-y-2 rounded-3xl border border-[#EFE9DC] bg-white/70 p-4 shadow-sm md:max-w-md">
          <select
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
          >
            <option value="">Selecciona paciente…</option>
            <option value={NUEVO_PACIENTE}>+ Paciente nuevo (dar de alta)</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.folio ? `· ${p.folio}` : ""}
              </option>
            ))}
          </select>

          {esNuevo && (
            <div className="space-y-2 rounded-xl border border-[#803449]/30 bg-[#F5E7E9] p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#803449]">
                <UserPlus size={13} /> Datos del paciente nuevo
              </div>
              <input
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                placeholder="Nombre completo *"
                className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
              />
              <input
                value={telefonoNuevo}
                onChange={(e) => setTelefonoNuevo(e.target.value)}
                placeholder="Teléfono (con WhatsApp)"
                className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
              />
              <p className="text-[11px] text-[#a49c8a]">
                Se le da de alta y se le crea su ficha automáticamente al agendar.
              </p>
            </div>
          )}

          <select
            value={tratamiento}
            onChange={(e) => elegirTratamiento(e.target.value)}
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
          >
            <option value="">Selecciona tratamiento…</option>
            {TRATAMIENTOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#a49c8a]">Fecha</label>
            <input
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#a49c8a]">
              $
            </span>
            <input
              type="number"
              min="0"
              value={monto}
              onChange={(e) => {
                setMonto(e.target.value);
                setMontoTocado(true);
              }}
              placeholder="Monto (opcional)"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white py-2 pl-7 pr-3 text-sm outline-none focus:border-[#803449]"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={crearCita}
              disabled={!puedeAgendar}
              className="flex-1 rounded-full bg-[#2b2118] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Agendar"}
            </button>
            <button
              onClick={resetForm}
              className="rounded-full border border-[#EFE9DC] px-4 py-2.5 text-[13px] font-medium text-[#8a8272]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {citas === null ? (
        <p className="text-sm text-[#8a8272]">Cargando…</p>
      ) : (
        <>
          <SelectorVista vista={vista} onCambiar={setVista} />

          {vista === "mes" ? (
            <SelectorMes ancla={diaSeleccionado} citasPorDia={citasPorDia} onSeleccionarDia={seleccionarDia} />
          ) : (
            <SelectorSemana
              diaSeleccionado={diaSeleccionado}
              citasPorDia={citasPorDia}
              onCambiarAncla={setDiaSeleccionado}
              onSeleccionarDia={seleccionarDia}
            />
          )}

          {vista === "dia" && (
            <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
              {citasDelDia.length === 0 ? (
                <p className="text-sm text-[#8a8272]">Sin citas para este día.</p>
              ) : (
                citasDelDia.map((c, i) => (
                  <CitaTimelineItem key={c.id} esUltimo={i === citasDelDia.length - 1} {...propsTimelineItem(c)} />
                ))
              )}
            </div>
          )}

          {vista === "semana" && (
            <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
              {citasDeLaSemana.length === 0 ? (
                <p className="text-sm text-[#8a8272]">Sin citas esta semana.</p>
              ) : (
                diasDeLaSemana.map((dia) => {
                  const clave = claveDia(dia);
                  const citasDia = citasDeLaSemana.filter((c) => claveDia(c.fecha_hora) === clave);
                  if (citasDia.length === 0) return null;
                  return (
                    <div key={clave} className="mb-5 last:mb-0">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#803449]">
                        {dia.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" })}
                      </div>
                      {citasDia.map((c, i) => (
                        <CitaTimelineItem key={c.id} esUltimo={i === citasDia.length - 1} {...propsTimelineItem(c)} />
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
