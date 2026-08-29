"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Calendar, Check, MessageCircle, TrendingUp, Wallet } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Pill } from "@/components/Pill";
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
      setMontoPago("");
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

      <div className="mt-4 flex gap-3 px-4">
        <Pill tone="green" onClick={() => router.push("/dashboard/citas?nuevo=1")}>
          Agendar cita
        </Pill>
        <Pill tone="rose" onClick={() => router.push("/dashboard/pacientes?nuevo=1")}>
          Nuevo paciente
        </Pill>
      </div>

      <div className="mx-4 mt-4 rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">Citas de hoy</div>
        {citasHoy === null ? (
          <p className="mt-2 text-sm text-[#8a8272]">Cargando…</p>
        ) : citasHoy.length === 0 ? (
          <p className="mt-2 text-sm text-[#8a8272]">Sin citas registradas por ahora.</p>
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
        <Link href="/dashboard/citas" className="mt-3 block text-[12px] font-semibold text-[#803449]">
          Ver toda la agenda →
        </Link>
      </div>

      <div className="mx-4 mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Calendar}
          iconBg="bg-[#F7E5E0] text-[#B0503A]"
          label="Citas esta semana"
          value={resumen ? resumen.citas_semana : "…"}
          sub={resumen ? `${resumen.citas_semana_confirmadas} confirmadas` : undefined}
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-[#E8F0E3] text-[#3F6B33]"
          label="Ingresos del mes"
          value={resumen ? formatearDinero(resumen.ingresos_mes) : "…"}
        />
        <StatCard
          icon={Wallet}
          iconBg="bg-[#FCEFD2] text-[#B08419]"
          label="Por cobrar"
          value={resumen ? formatearDinero(resumen.por_cobrar) : "…"}
          sub={resumen && resumen.por_cobrar > 0 ? "pendiente de pago" : undefined}
          subColor="text-[#B0503A]"
        />
        <Link href="/dashboard/citas">
          <StatCard
            icon={MessageCircle}
            iconBg="bg-[#EFE3F0] text-[#7A4D8A]"
            label="Agenda"
            value="Ver todo"
            sub="citas, pagos y cancelaciones"
          />
        </Link>
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
    </>
  );
}
