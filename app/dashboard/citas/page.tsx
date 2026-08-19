"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Check, X, DollarSign, UserPlus, ChevronLeft, ChevronRight, Pencil, RotateCcw } from "lucide-react";
import type { Cita, Paciente } from "@/lib/types";
import { formatearDinero } from "@/lib/dinero";
import { TRATAMIENTOS } from "@/lib/panel-data";

const NUEVO_PACIENTE = "__nuevo__";

const ESTADO_ESTILO: Record<Cita["estado"], string> = {
  agendada: "bg-[#F7E5E0] text-[#B0503A]",
  completada: "bg-[#E8F0E3] text-[#3F6B33]",
  cancelada: "bg-[#EFE9DC] text-[#a49c8a]",
};

const ESTADO_COLOR_NODO: Record<Cita["estado"], string> = {
  agendada: "#C96F3B",
  completada: "#3F6B33",
  cancelada: "#a49c8a",
};

// Domingo — la clínica no abre (ver CLINICA.horario en lib/panel-data.ts).
const DIA_NO_LABORAL = 0;

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

function SelectorSemana({
  diaSeleccionado,
  citasPorDia,
  onSeleccionarDia,
}: {
  diaSeleccionado: Date;
  citasPorDia: Record<string, number>;
  onSeleccionarDia: (d: Date) => void;
}) {
  const inicioSemana = useMemo(() => {
    const d = inicioDelDia(diaSeleccionado);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [diaSeleccionado]);

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + i)),
    [inicioSemana]
  );

  const hoyClave = claveDia(new Date());
  const claveSeleccionado = claveDia(diaSeleccionado);

  function moverSemana(delta: number) {
    onSeleccionarDia(new Date(diaSeleccionado.getFullYear(), diaSeleccionado.getMonth(), diaSeleccionado.getDate() + delta * 7));
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
          onClick={() => onSeleccionarDia(inicioDelDia(new Date()))}
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
                      ? "border border-[#C96F3B] text-[#2b2118]"
                      : noLaboral
                        ? "text-[#c9c2b3]"
                        : "text-[#2b2118] hover:bg-[#EFE9DC]/70"
                }`}
              >
                {d.getDate()}
              </span>
              <span
                className="h-1 w-1 rounded-full"
                style={{ backgroundColor: numCitas > 0 ? "#C96F3B" : "transparent" }}
              />
            </button>
          );
        })}
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

    if (fechaHora) setDiaSeleccionado(inicioDelDia(new Date(fechaHora)));
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
    setPagoAbiertoId(null);
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

  const esNuevo = pacienteId === NUEVO_PACIENTE;
  const puedeAgendar = (esNuevo ? nombreNuevo.trim() : pacienteId) && tratamiento.trim() && fechaHora && !guardando;

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
        <div className="space-y-2 rounded-3xl border border-[#EFE9DC] bg-white/70 p-4 shadow-sm md:max-w-md">
          <select
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
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
            <div className="space-y-2 rounded-xl border border-[#C96F3B]/30 bg-[#FBF3EC] p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#C96F3B]">
                <UserPlus size={13} /> Datos del paciente nuevo
              </div>
              <input
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                placeholder="Nombre completo *"
                className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
              />
              <input
                value={telefonoNuevo}
                onChange={(e) => setTelefonoNuevo(e.target.value)}
                placeholder="Teléfono (con WhatsApp)"
                className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
              />
              <p className="text-[11px] text-[#a49c8a]">
                Se le da de alta y se le crea su ficha automáticamente al agendar.
              </p>
            </div>
          )}

          <select
            value={tratamiento}
            onChange={(e) => elegirTratamiento(e.target.value)}
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
          >
            <option value="">Selecciona tratamiento…</option>
            {TRATAMIENTOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
              onChange={(e) => {
                setMonto(e.target.value);
                setMontoTocado(true);
              }}
              placeholder="Monto (opcional)"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
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
          <SelectorSemana diaSeleccionado={diaSeleccionado} citasPorDia={citasPorDia} onSeleccionarDia={setDiaSeleccionado} />

          <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
            {citasDelDia.length === 0 ? (
              <p className="text-sm text-[#8a8272]">Sin citas para este día.</p>
            ) : (
              citasDelDia.map((c, i) => {
                const esUltimo = i === citasDelDia.length - 1;
                const restante = c.monto != null ? Math.max(0, c.monto - c.pagado) : null;
                const progresoPago = c.monto ? Math.min(100, (c.pagado / c.monto) * 100) : 0;
                return (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-14 shrink-0 pt-1 text-right text-[13px] font-semibold text-[#2b2118]">
                      {formatearHora(c.fecha_hora)}
                    </div>
                    <div className="flex flex-col items-center">
                      <span
                        className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: ESTADO_COLOR_NODO[c.estado] }}
                      />
                      {!esUltimo && <span className="mt-1 w-px flex-1 bg-[#EFE9DC]" />}
                    </div>
                    <div className={`min-w-0 flex-1 ${esUltimo ? "" : "pb-5"}`}>
                      <div className="rounded-2xl bg-[#FBF9F5] p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFE9DC] text-[12px] font-semibold text-[#2b2118]">
                            {iniciales(c.paciente_nombre)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold leading-snug text-[#2b2118]">{c.paciente_nombre}</div>
                                <div className="text-xs text-[#a49c8a]">{c.tratamiento}</div>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${ESTADO_ESTILO[c.estado]}`}
                              >
                                {c.estado}
                              </span>
                            </div>

                            {c.monto != null && (
                              <div className="mt-2.5">
                                <div className="flex items-center justify-between text-xs text-[#8a8272]">
                                  <span>
                                    {formatearDinero(c.pagado)} de {formatearDinero(c.monto)}
                                  </span>
                                  {restante ? (
                                    <span className="font-semibold text-[#B0503A]">falta {formatearDinero(restante)}</span>
                                  ) : (
                                    <span className="font-semibold text-[#3F6B33]">pagado</span>
                                  )}
                                </div>
                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#EFE9DC]">
                                  <div
                                    className="h-full rounded-full bg-[#3F6B33] transition-all"
                                    style={{ width: `${progresoPago}%` }}
                                  />
                                </div>
                              </div>
                            )}

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
                              {c.estado !== "cancelada" && restante !== null && restante > 0 && (
                                <button
                                  onClick={() => {
                                    setEditandoId(null);
                                    setPagoAbiertoId(pagoAbiertoId === c.id ? null : c.id);
                                    setMontoPago("");
                                  }}
                                  className="flex items-center gap-1 rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2b2118]"
                                >
                                  <DollarSign size={12} /> Registrar pago
                                </button>
                              )}
                              <button
                                onClick={() => (editandoId === c.id ? setEditandoId(null) : abrirEdicion(c))}
                                className="flex items-center gap-1 rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2b2118]"
                              >
                                <Pencil size={12} /> Editar
                              </button>
                              {c.pagado > 0 && (
                                <button
                                  onClick={() => deshacerPago(c)}
                                  disabled={deshaciendoPagoId === c.id}
                                  className="flex items-center gap-1 rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#B0503A] disabled:opacity-50"
                                >
                                  <RotateCcw size={12} />{" "}
                                  {deshaciendoPagoId === c.id ? "Deshaciendo…" : "No se pagó, deshacer"}
                                </button>
                              )}
                            </div>

                            {editandoId === c.id && (
                              <div className="mt-3 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
                                <select
                                  value={editTratamiento}
                                  onChange={(e) => setEditTratamiento(e.target.value)}
                                  className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
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
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="datetime-local"
                                    value={editFechaHora}
                                    onChange={(e) => setEditFechaHora(e.target.value)}
                                    className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    value={editMonto}
                                    onChange={(e) => setEditMonto(e.target.value)}
                                    placeholder="Monto"
                                    className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={guardarEdicion}
                                    disabled={!editTratamiento.trim() || !editFechaHora || guardandoEdicion}
                                    className="flex-1 rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                                  >
                                    {guardandoEdicion ? "Guardando…" : "Guardar cambios"}
                                  </button>
                                  <button
                                    onClick={() => setEditandoId(null)}
                                    className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]"
                                  >
                                    Cancelar
                                  </button>
                                </div>
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
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
