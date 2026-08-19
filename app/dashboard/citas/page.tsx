"use client";

import { useEffect, useState } from "react";
import { Plus, Check, X, DollarSign } from "lucide-react";
import type { Cita, Paciente } from "@/lib/types";
import { formatearDinero } from "@/lib/dinero";
import { TRATAMIENTOS } from "@/lib/panel-data";

const ESTADO_ESTILO: Record<Cita["estado"], string> = {
  agendada: "bg-[#F7E5E0] text-[#B0503A]",
  completada: "bg-[#E8F0E3] text-[#3F6B33]",
  cancelada: "bg-[#EFE9DC] text-[#a49c8a]",
};

function formatearFechaHora(fechaHora: string) {
  return new Date(fechaHora).toLocaleString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CitasPage() {
  const [citas, setCitas] = useState<Cita[] | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [pagoAbiertoId, setPagoAbiertoId] = useState<number | null>(null);

  const [pacienteId, setPacienteId] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [montoPago, setMontoPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [guardandoPago, setGuardandoPago] = useState(false);

  async function cargar() {
    try {
      const [resCitas, resPacientes] = await Promise.all([
        fetch("/api/citas"),
        fetch("/api/pacientes"),
      ]);
      const dataCitas = await resCitas.json();
      const dataPacientes = await resPacientes.json();
      if (!resCitas.ok) throw new Error(dataCitas.error || `error ${resCitas.status}`);
      if (!resPacientes.ok) throw new Error(dataPacientes.error || `error ${resPacientes.status}`);
      setCitas(dataCitas.citas ?? []);
      setPacientes(dataPacientes.pacientes ?? []);
      setError(null);
    } catch (err) {
      setError(`No se pudo cargar la agenda: ${err instanceof Error ? err.message : "error desconocido"}`);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crearCita() {
    if (!pacienteId || !tratamiento.trim() || !fechaHora || guardando) return;
    setGuardando(true);
    await fetch("/api/citas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paciente_id: Number(pacienteId),
        tratamiento,
        fecha_hora: new Date(fechaHora).toISOString(),
        monto: monto ? Number(monto) : null,
      }),
    });
    setPacienteId("");
    setTratamiento("");
    setFechaHora("");
    setMonto("");
    setFormAbierto(false);
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
    setPagoAbiertoId(null);
    setMontoPago("");
    setMetodoPago("efectivo");
    setGuardandoPago(false);
    await cargar();
  }

  return (
    <div className="mx-4 mt-2 space-y-3 pb-6">
      {error && (
        <div className="rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]">
          {error}
        </div>
      )}
      {!formAbierto ? (
        <button
          onClick={() => setFormAbierto(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3 text-[14px] font-semibold text-white md:w-auto md:px-8"
        >
          <Plus size={15} /> Agendar cita
        </button>
      ) : (
        <div className="space-y-2 rounded-3xl border border-[#EFE9DC] bg-white/70 p-4 md:max-w-md">
          <select
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
          >
            <option value="">Selecciona paciente…</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.folio ? `· ${p.folio}` : ""}
              </option>
            ))}
          </select>
          <input
            list="tratamientos-sugeridos"
            value={tratamiento}
            onChange={(e) => setTratamiento(e.target.value)}
            placeholder="Tratamiento"
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
          />
          <datalist id="tratamientos-sugeridos">
            {TRATAMIENTOS.map((t) => (
              <option key={t.nombre} value={t.nombre} />
            ))}
          </datalist>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
            <input
              type="number"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Monto (opcional)"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={crearCita}
              disabled={!pacienteId || !tratamiento.trim() || !fechaHora || guardando}
              className="flex-1 rounded-full bg-[#2b2118] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Agendar"}
            </button>
            <button
              onClick={() => setFormAbierto(false)}
              className="rounded-full border border-[#EFE9DC] px-4 py-2.5 text-[13px] font-medium text-[#8a8272]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {citas === null ? (
        <p className="text-sm text-[#8a8272]">Cargando…</p>
      ) : citas.length === 0 ? (
        <p className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-sm text-[#8a8272]">
          Sin citas agendadas todavía.
        </p>
      ) : (
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
        {citas.map((c) => {
          const restante = c.monto != null ? Math.max(0, c.monto - c.pagado) : null;
          return (
            <div key={c.id} className="rounded-2xl border border-[#EFE9DC] bg-white/70 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-[#2b2118]">{c.paciente_nombre}</div>
                  <div className="text-xs text-[#a49c8a]">{c.tratamiento}</div>
                  <div className="mt-0.5 text-xs text-[#a49c8a]">{formatearFechaHora(c.fecha_hora)}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ESTADO_ESTILO[c.estado]}`}>
                  {c.estado}
                </span>
              </div>

              {c.monto != null && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#8a8272]">
                  <DollarSign size={12} />
                  {formatearDinero(c.pagado)} de {formatearDinero(c.monto)}
                  {restante ? <span className="font-semibold text-[#B0503A]"> · falta {formatearDinero(restante)}</span> : " · pagado"}
                </div>
              )}

              {c.estado !== "cancelada" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.estado === "agendada" && (
                    <>
                      <button
                        onClick={() => cambiarEstado(c.id, "completada")}
                        className="flex items-center gap-1 rounded-full bg-[#E8F0E3] px-3 py-1.5 text-[12px] font-semibold text-[#3F6B33]"
                      >
                        <Check size={12} /> Completada
                      </button>
                      <button
                        onClick={() => cambiarEstado(c.id, "cancelada")}
                        className="flex items-center gap-1 rounded-full bg-[#F7E5E0] px-3 py-1.5 text-[12px] font-semibold text-[#B0503A]"
                      >
                        <X size={12} /> Cancelar
                      </button>
                    </>
                  )}
                  {restante !== null && restante > 0 && (
                    <button
                      onClick={() => {
                        setPagoAbiertoId(pagoAbiertoId === c.id ? null : c.id);
                        setMontoPago("");
                      }}
                      className="flex items-center gap-1 rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2b2118]"
                    >
                      <DollarSign size={12} /> Registrar pago
                    </button>
                  )}
                </div>
              )}

              {pagoAbiertoId === c.id && (
                <div className="mt-3 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
                  <input
                    type="number"
                    min="0"
                    value={montoPago}
                    onChange={(e) => setMontoPago(e.target.value)}
                    placeholder={`Monto (falta ${formatearDinero(restante ?? 0)})`}
                    className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
                  />
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => registrarPago(c)}
                      disabled={guardandoPago}
                      className="flex-1 rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                    >
                      {guardandoPago ? "Guardando…" : "Guardar pago"}
                    </button>
                    <button
                      onClick={() => setPagoAbiertoId(null)}
                      className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
