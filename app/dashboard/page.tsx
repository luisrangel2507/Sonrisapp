"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MoreVertical,
  Plus,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Hero } from "@/components/Hero";
import { StatCard } from "@/components/StatCard";
import { BotChat } from "@/components/BotChat";
import { formatearDinero } from "@/lib/dinero";
import { citaVencidaSinCompletar } from "@/lib/fechas";
import { pagoConfirmado } from "@/lib/citas";
import { DOCTORA } from "@/lib/panel-data";
import type { Cita, ResumenDashboard } from "@/lib/types";

function formatearHora(fechaHora: string) {
  return new Date(fechaHora).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
}

function saludoPorHora() {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

function fechaLarga() {
  const texto = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Mismos tonos que la lista de Pacientes — para que los avatares de
// "Pacientes recientes" se vean consistentes en toda la app.
const PALETA_AVATAR = [
  { bg: "bg-[#F7E5E0]", text: "text-[#B0503A]" },
  { bg: "bg-[#E8F0E3]", text: "text-[#3F6B33]" },
  { bg: "bg-[#FCEFD2]", text: "text-[#B08419]" },
  { bg: "bg-[#EFE3F0]", text: "text-[#7A4D8A]" },
];

function iniciales(nombreCompleto: string) {
  const partes = nombreCompleto.trim().split(/\s+/);
  const primera = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primera + ultima).toUpperCase();
}

// Delta % vs. el periodo anterior — null si no hay con qué comparar
// (periodo anterior en cero), para no inventar un porcentaje sin sentido.
function deltaPorcentaje(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

function Tendencia({ actual, anterior }: { actual: number; anterior: number }) {
  const delta = deltaPorcentaje(actual, anterior);
  if (delta === null) return null;
  const subio = delta >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 ${subio ? "text-[#3F6B33]" : "text-[#B0503A]"}`}>
      {subio ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {subio ? "+" : ""}
      {delta}%
    </span>
  );
}

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function MiniCalendario({ citasHoy }: { citasHoy: Cita[] | null }) {
  const hoy = new Date();
  const [mesVisible, setMesVisible] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));

  const primerDiaSemana = (mesVisible.getDay() + 6) % 7; // lunes = 0
  const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array(primerDiaSemana).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];

  const esMesActual = mesVisible.getFullYear() === hoy.getFullYear() && mesVisible.getMonth() === hoy.getMonth();
  const nombreMes = mesVisible.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#2b2118]">
          <Calendar size={14} className="text-[#803449]" />
          {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setMesVisible((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#a49c8a] hover:bg-[#EFE9DC]"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setMesVisible((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#a49c8a] hover:bg-[#EFE9DC]"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1.5 text-center">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-[10px] font-semibold uppercase text-[#a49c8a]">
            {d}
          </div>
        ))}
        {celdas.map((dia, i) => {
          const esHoy = esMesActual && dia === hoy.getDate();
          return (
            <div key={i} className="flex items-center justify-center py-0.5">
              {dia && (
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${
                    esHoy ? "bg-[#803449] font-semibold text-white" : "text-[#2b2118]"
                  }`}
                >
                  {dia}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {esMesActual && citasHoy && citasHoy.length > 0 && (
        <p className="mt-2 border-t border-[#EFE9DC] pt-2 text-[11px] text-[#a49c8a]">
          {citasHoy.length} cita{citasHoy.length === 1 ? "" : "s"} hoy
        </p>
      )}
    </div>
  );
}

// "YYYY-MM-DD" en horario local — para mandar a Citas el día exacto
// que debe abrir (?ir=), sin desfasarse por la zona horaria.
function claveDiaLocal(fechaHora: string) {
  const d = new Date(fechaHora);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const NOMBRE_CORTO_DOCTORA = DOCTORA.nombre.split(" ").slice(0, 2).join(" ");

export default function PanelPage() {
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [citasHoy, setCitasHoy] = useState<Cita[] | null>(null);
  const [citasVencidas, setCitasVencidas] = useState<Cita[]>([]);
  const [citasPendientesAprobacion, setCitasPendientesAprobacion] = useState<Cita[]>([]);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);
  const [errorCitas, setErrorCitas] = useState<string | null>(null);
  // Empieza en null (sin nombre) en vez de adivinar uno — mostrar un
  // nombre "de relleno" y luego cambiarlo al real cuando llega la
  // respuesta de /api/perfil es justo el parpadeo que se reportó.
  const [nombreBienvenida, setNombreBienvenida] = useState<string | null>(null);

  const [completandoId, setCompletandoId] = useState<number | null>(null);
  const [montoPago, setMontoPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [guardandoCompletar, setGuardandoCompletar] = useState(false);

  // Solo para la vista de escritorio (tarjeta "Pacientes recientes") —
  // la cita más reciente de cada paciente, para mostrar qué tratamiento
  // se hizo en vez de solo la fecha en que se dio de alta.
  const [actividadReciente, setActividadReciente] = useState<Cita[] | null>(null);

  function cargarCitas() {
    fetch("/api/citas")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const hoy = new Date().toDateString();
        const citas: Cita[] = data.citas ?? [];
        setCitasHoy(
          citas
            .filter((c) => c.estado !== "cancelada" && new Date(c.fecha_hora).toDateString() === hoy)
            .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
        );
        setCitasVencidas(
          citas.filter(citaVencidaSinCompletar).sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
        );
        setCitasPendientesAprobacion(
          citas.filter((c) => c.pendiente_aprobacion).sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
        );

        // citas ya viene ordenado por fecha_hora DESC (API) — basta con
        // quedarse con la primera cita (no cancelada) que aparezca de
        // cada paciente para tener su visita más reciente.
        const vistos = new Set<number>();
        const recientes: Cita[] = [];
        for (const c of citas) {
          if (c.estado === "cancelada" || vistos.has(c.paciente_id)) continue;
          vistos.add(c.paciente_id);
          recientes.push(c);
          if (recientes.length >= 4) break;
        }
        setActividadReciente(recientes);
      })
      .catch((err) => setErrorCitas(`No se pudieron cargar las citas: ${err.message}`));
  }

  useEffect(() => {
    fetch("/api/perfil")
      .then((res) => res.json())
      .then((data) => {
        setNombreBienvenida(data?.nombre_bienvenida || NOMBRE_CORTO_DOCTORA);
      })
      .catch(() => setNombreBienvenida(NOMBRE_CORTO_DOCTORA));

    fetch("/api/dashboard/resumen")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `error ${res.status}`);
        return res.json();
      })
      .then((data) => setResumen(data.resumen ?? null))
      .catch((err) => setErrorResumen(`No se pudo cargar el resumen: ${err.message}`));

    cargarCitas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si ya no debe nada, completa directo; si debe, abre el formulario
  // para elegir el método de pago — al guardar, completa la cita Y
  // registra el pago en un solo paso (igual que en Agenda).
  function abrirCompletar(cita: Cita) {
    const restante = cita.monto != null ? Math.max(0, cita.monto - cita.pagado) : null;
    if (restante && restante > 0) {
      setCompletandoId(cita.id);
      setMontoPago(String(restante));
      setMetodoPago("efectivo");
    } else {
      completarDirecto(cita.id);
    }
  }

  async function completarDirecto(id: number) {
    await fetch("/api/citas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado: "completada" }),
    });
    cargarCitas();
  }

  async function confirmarPagoYCompletar(cita: Cita) {
    const restante = (cita.monto ?? 0) - cita.pagado;
    const montoFinal = montoPago ? Number(montoPago) : restante;
    if (!montoFinal || montoFinal <= 0 || guardandoCompletar) return;
    setGuardandoCompletar(true);
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
    await fetch("/api/citas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cita.id, estado: "completada" }),
    });
    setCompletandoId(null);
    setMontoPago("");
    setMetodoPago("efectivo");
    setGuardandoCompletar(false);
    cargarCitas();
  }

  return (
    <>
    <div className="md:hidden">
      <div className="flex items-start justify-between border-y border-[#EFE9DC] px-5 py-4">
        <div>
          <h2 className="text-xl font-bold text-[#2b2118]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {nombreBienvenida ? `Bienvenida, ${nombreBienvenida}` : "Bienvenida"}
          </h2>
          <p className="mt-1 text-sm text-[#8a8272]">We&apos;ll be glowing in the dark ✨</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[11px] uppercase tracking-wide text-[#a49c8a]">Citas hoy</div>
          <div className="text-2xl font-bold text-[#3F6B33]">{resumen?.citas_hoy ?? "…"}</div>
        </div>
      </div>

      {citasVencidas.length > 0 && (
        <Link
          href={`/dashboard/citas?ir=${claveDiaLocal(citasVencidas[0].fecha_hora)}`}
          className="mx-4 mt-4 flex items-start gap-2.5 rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>
              {citasVencidas.length} cita{citasVencidas.length === 1 ? "" : "s"} sin marcar como completada
              {citasVencidas.length === 1 ? "" : "s"}
            </strong>{" "}
            — ya pasaron más de 2 horas. Tócalo para ir a la más antigua.
          </span>
        </Link>
      )}

      {citasPendientesAprobacion.length > 0 && (
        <Link
          href="/dashboard/citas"
          className="mx-4 mt-4 flex items-start gap-2.5 rounded-2xl border border-[#E8CFA0] bg-[#F7ECD9] px-4 py-3 text-[13px] text-[#B0834A]"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>
              {citasPendientesAprobacion.length} solicitud{citasPendientesAprobacion.length === 1 ? "" : "es"} de
              cita en línea sin aprobar
            </strong>{" "}
            — se agendaron solas desde el link de Instagram. Tócalo para revisarlas.
          </span>
        </Link>
      )}

      {(errorResumen || errorCitas) && (
        <div className="mx-4 mt-4 space-y-2">
          {errorResumen && (
            <div className="rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]">
              {errorResumen}
            </div>
          )}
          {errorCitas && (
            <div className="rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]">
              {errorCitas}
            </div>
          )}
        </div>
      )}

      <div className="mt-5">
        <Hero />
      </div>

      <div className="mx-4 mt-4 rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-bold text-[#2b2118]">Próximas citas</div>
          <Link href="/dashboard/citas" className="text-[12px] font-semibold text-[#803449]">
            Ver todas →
          </Link>
        </div>
        {citasHoy === null ? (
          <p className="mt-3 text-sm text-[#8a8272]">Cargando…</p>
        ) : citasHoy.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-[#FBF9F5] py-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F7E5E0] text-[#B0503A]">
              <Calendar size={18} />
            </div>
            <p className="text-sm font-medium text-[#2b2118]">Sin citas registradas por ahora.</p>
            <p className="text-[13px] text-[#a49c8a]">¡Disfruta el resto del día!</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {citasHoy.map((c) => (
              <div key={c.id} className="border-b border-[#EFE9DC] pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[#2b2118]">{c.paciente_nombre}</div>
                    <div className="text-xs text-[#a49c8a]">{c.tratamiento}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-sm font-semibold text-[#2b2118]">{formatearHora(c.fecha_hora)}</div>
                    {c.estado === "agendada" ? (
                      <button
                        onClick={() => (completandoId === c.id ? setCompletandoId(null) : abrirCompletar(c))}
                        className="whitespace-nowrap rounded-full bg-[#F7E5E0] px-2.5 py-1 text-[11px] font-semibold text-[#B0503A]"
                      >
                        Pendiente
                      </button>
                    ) : c.estado === "completada" ? (
                      pagoConfirmado(c) ? (
                        <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-[#E8F0E3] px-2.5 py-1 text-[11px] font-semibold text-[#3F6B33]">
                          <Check size={11} /> Completada
                        </span>
                      ) : (
                        <span className="whitespace-nowrap rounded-full bg-[#F7ECD9] px-2.5 py-1 text-[11px] font-semibold text-[#B0834A]">
                          Confirmación pendiente
                        </span>
                      )
                    ) : (
                      <span className="whitespace-nowrap rounded-full bg-[#EFE9DC] px-2.5 py-1 text-[11px] font-semibold text-[#a49c8a]">
                        Cancelada
                      </span>
                    )}
                    <Link
                      href={`/dashboard/citas?ir=${claveDiaLocal(c.fecha_hora)}`}
                      aria-label="Ver en la agenda"
                      className="shrink-0 rounded-full p-1 text-[#a49c8a] hover:bg-[#EFE9DC]/70"
                    >
                      <MoreVertical size={15} />
                    </Link>
                  </div>
                </div>

                {completandoId === c.id && (
                  <div className="mt-2.5 space-y-2 rounded-2xl border border-[#EFE9DC] bg-[#FBF9F5] p-3">
                    <p className="text-[12px] font-medium text-[#3F6B33]">
                      ¿Cómo pagó? La cita se marcará como completada al guardar.
                    </p>
                    <input
                      type="number"
                      min="0"
                      value={montoPago}
                      onChange={(e) => setMontoPago(e.target.value)}
                      placeholder={`Monto (falta ${formatearDinero(Math.max(0, (c.monto ?? 0) - c.pagado))})`}
                      className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
                    />
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmarPagoYCompletar(c)}
                        disabled={guardandoCompletar}
                        className="flex-1 rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                      >
                        {guardandoCompletar ? "Guardando…" : "Confirmar pago y completar"}
                      </button>
                      <button
                        onClick={() => setCompletandoId(null)}
                        className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
        <StatCard
          icon={Calendar}
          iconBg="bg-[#F7E5E0] text-[#B0503A]"
          label="Citas esta semana"
          value={resumen ? resumen.citas_semana : "…"}
          sub={resumen ? <Tendencia actual={resumen.citas_semana} anterior={resumen.citas_semana_pasada} /> : undefined}
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-[#E8F0E3] text-[#3F6B33]"
          label="Ingresos del mes"
          value={resumen ? formatearDinero(resumen.ingresos_mes) : "…"}
          sub={resumen ? <Tendencia actual={resumen.ingresos_mes} anterior={resumen.ingresos_mes_pasado} /> : undefined}
        />
        <StatCard
          icon={Wallet}
          iconBg="bg-[#FCEFD2] text-[#B08419]"
          label="Por cobrar"
          value={resumen ? formatearDinero(resumen.por_cobrar) : "…"}
          sub={resumen && resumen.por_cobrar > 0 ? "pendiente de pago" : undefined}
          subColor="text-[#B0503A]"
        />
      </div>

      <div className="mx-4 mt-6">
        {!showChat ? (
          <button
            onClick={() => setShowChat(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#EFE9DC] bg-white py-3.5 text-[15px] font-semibold text-[#2b2118]"
          >
            <MessageCircle size={16} /> Probar el bot de WhatsApp
          </button>
        ) : (
          <div className="h-[440px]">
            <BotChat />
          </div>
        )}
      </div>
    </div>

      {/* ---- Vista de escritorio ---- */}
      <div className="hidden md:block">
        {(errorResumen || errorCitas) && (
          <div className="mb-5 space-y-2">
            {errorResumen && (
              <div className="rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]">
                {errorResumen}
              </div>
            )}
            {errorCitas && (
              <div className="rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]">
                {errorCitas}
              </div>
            )}
          </div>
        )}

        {citasVencidas.length > 0 && (
          <Link
            href={`/dashboard/citas?ir=${claveDiaLocal(citasVencidas[0].fecha_hora)}`}
            className="mb-4 flex items-start gap-2.5 rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              <strong>
                {citasVencidas.length} cita{citasVencidas.length === 1 ? "" : "s"} sin marcar como completada
                {citasVencidas.length === 1 ? "" : "s"}
              </strong>{" "}
              — ya pasaron más de 2 horas.
            </span>
          </Link>
        )}

        {citasPendientesAprobacion.length > 0 && (
          <Link
            href="/dashboard/citas"
            className="mb-4 flex items-start gap-2.5 rounded-2xl border border-[#E8CFA0] bg-[#F7ECD9] px-4 py-3 text-[13px] text-[#B0834A]"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              <strong>
                {citasPendientesAprobacion.length} solicitud{citasPendientesAprobacion.length === 1 ? "" : "es"} de
                cita en línea sin aprobar
              </strong>{" "}
              — se agendaron solas desde el link de Instagram.
            </span>
          </Link>
        )}

        {/* Encabezado de bienvenida */}
        <div className="flex overflow-hidden rounded-[28px] border border-[#EFE9DC] bg-white/70">
          <div className="flex-1 p-7">
            <h1
              className="text-[26px] font-bold text-[#2b2118]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              ¡{saludoPorHora()}, {nombreBienvenida ?? "…"}! 👋
            </h1>
            <p className="mt-1 text-sm text-[#8a8272]">{fechaLarga()}</p>
            <p className="mt-5 max-w-sm text-[15px] italic leading-relaxed text-[#2b2118]/80">
              &ldquo;La gente sale de tu consultorio con una sonrisa.
              <br />
              Eso no tiene comparación.&rdquo;
            </p>
          </div>
          <div className="relative hidden w-72 shrink-0 lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-diente-atardecer.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white/0" />
          </div>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Calendar}
            iconBg="bg-[#F7E5E0] text-[#B0503A]"
            label="Citas esta semana"
            value={resumen ? resumen.citas_semana : "…"}
            sub={
              resumen ? (
                <Tendencia actual={resumen.citas_semana} anterior={resumen.citas_semana_pasada} />
              ) : undefined
            }
          />
          <StatCard
            icon={TrendingUp}
            iconBg="bg-[#E8F0E3] text-[#3F6B33]"
            label="Ingresos del mes"
            value={resumen ? formatearDinero(resumen.ingresos_mes) : "…"}
            sub={
              resumen ? (
                <Tendencia actual={resumen.ingresos_mes} anterior={resumen.ingresos_mes_pasado} />
              ) : undefined
            }
          />
          <StatCard
            icon={Wallet}
            iconBg="bg-[#FCEFD2] text-[#B08419]"
            label="Por cobrar"
            value={resumen ? formatearDinero(resumen.por_cobrar) : "…"}
            sub={resumen && resumen.por_cobrar > 0 ? "pendiente de pago" : undefined}
            subColor="text-[#B0503A]"
          />
          <StatCard
            icon={Users}
            iconBg="bg-[#EFE3F0] text-[#7A4D8A]"
            label="Pacientes activos"
            value={resumen ? resumen.pacientes_activos : "…"}
          />
        </div>

        {/* Agenda de hoy + pacientes recientes + calendario/acciones */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px_320px]">
          <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[15px] font-bold text-[#2b2118]">
                <Calendar size={16} className="text-[#803449]" />
                Agenda de hoy
              </div>
              <Link href="/dashboard/citas" className="text-[12px] font-semibold text-[#803449]">
                Ver agenda completa →
              </Link>
            </div>

            {citasHoy === null ? (
              <p className="mt-4 text-sm text-[#8a8272]">Cargando…</p>
            ) : citasHoy.length === 0 ? (
              <p className="mt-4 text-sm text-[#8a8272]">Sin citas registradas por ahora.</p>
            ) : (
              <div className="mt-3 divide-y divide-[#EFE9DC]">
                {citasHoy.map((c, i) => {
                  const paleta = PALETA_AVATAR[i % PALETA_AVATAR.length];
                  const estadoPill =
                    c.estado === "cancelada" ? (
                      <span className="whitespace-nowrap rounded-full bg-[#EFE9DC] px-2.5 py-1 text-[11px] font-semibold text-[#a49c8a]">
                        Cancelada
                      </span>
                    ) : c.estado === "completada" ? (
                      pagoConfirmado(c) ? (
                        <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-[#E8F0E3] px-2.5 py-1 text-[11px] font-semibold text-[#3F6B33]">
                          <Check size={11} /> Completada
                        </span>
                      ) : (
                        <span className="whitespace-nowrap rounded-full bg-[#F7ECD9] px-2.5 py-1 text-[11px] font-semibold text-[#B0834A]">
                          Confirmación pendiente
                        </span>
                      )
                    ) : c.pendiente_aprobacion ? (
                      <span className="whitespace-nowrap rounded-full bg-[#F7ECD9] px-2.5 py-1 text-[11px] font-semibold text-[#B0834A]">
                        Pendiente
                      </span>
                    ) : (
                      <span className="whitespace-nowrap rounded-full bg-[#E3EEF7] px-2.5 py-1 text-[11px] font-semibold text-[#3E6FD9]">
                        Confirmada
                      </span>
                    );
                  return (
                    <Link
                      key={c.id}
                      href={`/dashboard/citas?ir=${claveDiaLocal(c.fecha_hora)}`}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${paleta.bg} ${paleta.text}`}
                      >
                        {iniciales(c.paciente_nombre)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[#2b2118]">{c.paciente_nombre}</div>
                        <div className="truncate text-xs text-[#a49c8a]">{c.tratamiento}</div>
                      </div>
                      <div className="shrink-0 text-right text-sm font-semibold text-[#2b2118]">
                        {formatearHora(c.fecha_hora)}
                      </div>
                      {estadoPill}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-bold text-[#2b2118]">Pacientes recientes</div>
              <Link href="/dashboard/pacientes" className="text-[11px] font-semibold text-[#803449]">
                Ver todos →
              </Link>
            </div>
            {actividadReciente === null ? (
              <p className="mt-3 text-[13px] text-[#8a8272]">Cargando…</p>
            ) : actividadReciente.length === 0 ? (
              <p className="mt-3 text-[13px] text-[#8a8272]">Sin pacientes registrados.</p>
            ) : (
              <div className="mt-2 divide-y divide-[#EFE9DC]">
                {actividadReciente.map((c, i) => {
                  const paleta = PALETA_AVATAR[i % PALETA_AVATAR.length];
                  return (
                    <Link
                      key={c.id}
                      href={`/dashboard/pacientes/${c.paciente_id}`}
                      className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${paleta.bg} ${paleta.text}`}
                      >
                        {iniciales(c.paciente_nombre)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-[#2b2118]">{c.paciente_nombre}</div>
                        <div className="truncate text-[11px] text-[#a49c8a]">{c.tratamiento}</div>
                      </div>
                      <div className="shrink-0 text-[11px] text-[#a49c8a]">
                        {new Date(c.fecha_hora).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <MiniCalendario citasHoy={citasHoy} />

            <div className="space-y-2.5">
              <button
                onClick={() => router.push("/dashboard/citas?nuevo=1")}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5C2235] py-3 text-[14px] font-semibold text-white"
              >
                <Plus size={15} /> Nueva cita
              </button>
              <button
                onClick={() => router.push("/dashboard/pacientes?nuevo=1")}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[#EFE9DC] bg-white py-3 text-[14px] font-semibold text-[#2b2118]"
              >
                <UserPlus size={15} /> Nuevo paciente
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
