"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { HISTORIA_CLINICA_VACIA, type FormStateHistoriaClinica } from "@/components/HistoriaClinicaFormulario";
import { HistoriaClinicaWizard } from "@/components/HistoriaClinicaWizard";

interface PacientePublico {
  id: number;
  nombre: string;
  fecha_nacimiento: string | null;
  telefono: string | null;
}

export default function FormularioPublicoPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [paciente, setPaciente] = useState<PacientePublico | null>(null);
  const [form, setForm] = useState<FormStateHistoriaClinica>(HISTORIA_CLINICA_VACIA);
  const [cargando, setCargando] = useState(true);
  const [invalido, setInvalido] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof FormStateHistoriaClinica>(campo: K, valor: FormStateHistoriaClinica[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
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
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
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
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F1EA] px-6 text-center">
        <div>
          <CheckCircle2 className="mx-auto mb-3 text-[#3F6B33]" size={40} />
          <p className="text-lg font-semibold text-[#2b2118]">¡Gracias, {paciente.nombre.split(" ")[0]}!</p>
          <p className="mt-2 text-sm text-[#8a8272]">Tu información fue enviada. Ya puedes cerrar esta ventana.</p>
          <button
            onClick={() => setEnviado(false)}
            className="mt-4 text-[13px] font-medium text-[#803449] underline underline-offset-2"
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
        pacienteFechaNacimiento={paciente.fecha_nacimiento}
        pacienteTelefono={paciente.telefono}
        onEnviar={enviar}
        guardando={guardando}
        error={error}
      />
    </div>
  );
}
