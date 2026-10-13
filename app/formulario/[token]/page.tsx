"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { HISTORIA_CLINICA_VACIA, type FormStateHistoriaClinica } from "@/components/HistoriaClinicaFormulario";
import { HistoriaClinicaWizard, type DatosPacienteWizard } from "@/components/HistoriaClinicaWizard";
import { PUNTOS_HISTORIA_CLINICA } from "@/lib/recompensas";

interface PacientePublico {
  id: number;
  nombre: string;
  fecha_nacimiento: string | null;
  telefono: string | null;
  email: string | null;
  alergias: boolean | null;
  alergias_cual: string | null;
  antecedentes_medicos: boolean | null;
  antecedentes_medicos_cual: string | null;
  puntos?: number;
  meta_premio?: number | null;
  premio_actual?: string | null;
  historia_puntos_otorgados?: boolean;
}

interface Recompensa {
  puntosGanados: number;
  puntos: number;
  meta_premio: number | null;
  premio_actual: string | null;
}

// Confeti hecho con CSS (sin librerías): piezas que caen con giro y
// colores de la marca.
function Confeti() {
  const colores = ["#7A1E33", "#D88A9A", "#F0C24E", "#E3B9C1", "#9B3048"];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {Array.from({ length: 60 }, (_, i) => (
        <span
          key={i}
          className="absolute top-[-20px] block h-3 w-2 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colores[i % colores.length],
            animation: `confeti ${2.4 + (i % 5) * 0.4}s ${(i % 10) * 0.12}s ease-in forwards`,
          }}
        />
      ))}
      <style>{`@keyframes confeti{to{transform:translateY(110vh) rotate(720deg);opacity:.9}}`}</style>
    </div>
  );
}

function ContadorPuntos({ desde, hasta }: { desde: number; hasta: number }) {
  const [v, setV] = useState(desde);
  useEffect(() => {
    let raf = 0;
    const inicio = performance.now();
    const paso = (t: number) => {
      const k = Math.min(1, (t - inicio) / 1200);
      setV(Math.round(desde + (hasta - desde) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [desde, hasta]);
  return <>{v}</>;
}

const DATOS_PACIENTE_VACIOS: DatosPacienteWizard = {
  telefono: null,
  email: null,
  alergias: null,
  alergias_cual: null,
  antecedentes_medicos: null,
  antecedentes_medicos_cual: null,
};

export default function FormularioPublicoPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [paciente, setPaciente] = useState<PacientePublico | null>(null);
  const [fechaNacimiento, setFechaNacimiento] = useState<string | null>(null);
  const [datosPaciente, setDatosPaciente] = useState<DatosPacienteWizard>(DATOS_PACIENTE_VACIOS);
  const [form, setForm] = useState<FormStateHistoriaClinica>(HISTORIA_CLINICA_VACIA);
  const [cargando, setCargando] = useState(true);
  const [invalido, setInvalido] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [recompensa, setRecompensa] = useState<Recompensa | null>(null);

  function set<K extends keyof FormStateHistoriaClinica>(campo: K, valor: FormStateHistoriaClinica[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function setDato<K extends keyof DatosPacienteWizard>(campo: K, valor: DatosPacienteWizard[K]) {
    setDatosPaciente((prev) => ({ ...prev, [campo]: valor }));
  }

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/formulario/${token}`);
        const data = await res.json();
        if (!res.ok || !data.paciente) {
          setInvalido(true);
          setCargando(false);
          return;
        }
        setPaciente(data.paciente);
        setFechaNacimiento(data.paciente.fecha_nacimiento ? data.paciente.fecha_nacimiento.slice(0, 10) : null);
        setDatosPaciente({
          telefono: data.paciente.telefono ?? null,
          email: data.paciente.email ?? null,
          alergias: data.paciente.alergias ?? null,
          alergias_cual: data.paciente.alergias_cual ?? null,
          antecedentes_medicos: data.paciente.antecedentes_medicos ?? null,
          antecedentes_medicos_cual: data.paciente.antecedentes_medicos_cual ?? null,
        });
        if (data.historiaClinica) {
          setForm({
            ...HISTORIA_CLINICA_VACIA,
            ...data.historiaClinica,
            fecha: data.historiaClinica.fecha.slice(0, 10),
          });
        }
        setCargando(false);
      } catch {
        setInvalido(true);
        setCargando(false);
      }
    })();
  }, [token]);

  async function enviar() {
    setGuardando(true);
    setError("");
    try {
      const res = await fetch(`/api/formulario/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fecha_nacimiento: fechaNacimiento, ...datosPaciente }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => ({}));
      if (data.recompensa) {
        setRecompensa(data.recompensa);
        setPaciente((p) => (p ? { ...p, historia_puntos_otorgados: true } : p));
      }
      setEnviado(true);
    } catch {
      setError("No se pudo enviar tu información. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F1EA]">
        <p className="text-sm text-[#8a8272]">Cargando…</p>
      </div>
    );
  }

  if (invalido || !paciente) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F1EA] px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-[#2b2118]">Este link ya no es válido</p>
          <p className="mt-2 text-sm text-[#8a8272]">Pídele a tu clínica que te comparta un link nuevo.</p>
        </div>
      </div>
    );
  }

  if (enviado) {
    const meta = recompensa?.meta_premio ?? null;
    const avance = recompensa && meta ? Math.min(100, (recompensa.puntos / meta) * 100) : 0;
    return (
      <div
        className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 text-center"
        style={{ background: "linear-gradient(180deg, #F8F1EC 0%, #F3E6E1 100%)" }}
      >
        <Confeti />
        <div className="relative w-full max-w-sm">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#7A1E33] text-[44px] shadow-[0_14px_34px_-10px_rgba(122,30,51,0.7)]">
            🦷
          </div>
          <h1 className="mt-5 text-[28px] font-bold leading-tight text-[#7A1E33]" style={{ fontFamily: "Georgia, serif" }}>
            ¡Lo lograste, {paciente.nombre.split(" ")[0]}!
          </h1>
          <p className="mt-2 text-[14px] text-[#8a8272]">Completaste todos los niveles de tu historia clínica. ¡Gracias!</p>

          {recompensa && (
            <div className="mt-6 rounded-3xl bg-white/90 p-5 shadow-[0_8px_24px_-12px_rgba(122,30,51,0.35)]">
              <div className="text-[13px] font-semibold uppercase tracking-wide text-[#a49c8a]">Ganaste</div>
              <div className="text-[44px] font-bold leading-none text-[#7A1E33]">
                +<ContadorPuntos desde={0} hasta={recompensa.puntosGanados} />
              </div>
              <div className="text-[13px] text-[#8a8272]">puntos</div>
              {meta ? (
                <div className="mt-4 text-left">
                  <div className="mb-1 flex justify-between text-[12px] text-[#8a8272]">
                    <span>{recompensa.premio_actual ?? "Tu próximo premio"}</span>
                    <span>
                      <ContadorPuntos desde={recompensa.puntos - recompensa.puntosGanados} hasta={recompensa.puntos} /> / {meta}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#EADAD5]">
                    <div className="h-full rounded-full bg-[#7A1E33] transition-[width] duration-[1500ms]" style={{ width: `${avance}%` }} />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <p className="mt-6 text-[13px] text-[#8a8272]">Ya puedes cerrar esta ventana.</p>
          <button
            onClick={() => setEnviado(false)}
            className="mt-2 text-[13px] font-medium text-[#803449] underline underline-offset-2"
          >
            Editar mi respuesta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F5F1EA]">
      <HistoriaClinicaWizard
        form={form}
        set={set}
        pacienteNombre={paciente.nombre}
        pacienteFechaNacimiento={fechaNacimiento}
        onChangeFechaNacimiento={setFechaNacimiento}
        datosPaciente={datosPaciente}
        onChangeDatosPaciente={setDato}
        onEnviar={enviar}
        guardando={guardando}
        error={error}
        puntosPremio={paciente.historia_puntos_otorgados ? null : PUNTOS_HISTORIA_CLINICA}
      />
    </div>
  );
}
