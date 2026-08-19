"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CreditCard, ClipboardList, Plus, Save, Share2 } from "lucide-react";
import type { Paciente, PacienteNota } from "@/lib/types";
import { Odontograma } from "@/components/Odontograma";
import { fechaSoloDia } from "@/lib/fechas";

function formatearFecha(fecha: string) {
  return fechaSoloDia(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export default function PacienteDetallePage() {
  const params = useParams<{ id: string }>();
  const pacienteId = Number(params.id);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [notas, setNotas] = useState<PacienteNota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [alergias, setAlergias] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [antecedentes, setAntecedentes] = useState("");

  const [formNotaAbierto, setFormNotaAbierto] = useState(false);
  const [tipoNota, setTipoNota] = useState("");
  const [textoNota, setTextoNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);

  const [enviandoLink, setEnviandoLink] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  async function cargar() {
    setCargando(true);
    const [resPaciente, resNotas] = await Promise.all([
      fetch(`/api/pacientes/${pacienteId}`),
      fetch(`/api/pacientes/${pacienteId}/notas`),
    ]);
    const dataPaciente = await resPaciente.json();
    const dataNotas = await resNotas.json();
    const p: Paciente = dataPaciente.paciente;
    setPaciente(p);
    setNombre(p.nombre);
    setTelefono(p.telefono ?? "");
    setEmail(p.email ?? "");
    setFechaNacimiento(p.fecha_nacimiento ? p.fecha_nacimiento.slice(0, 10) : "");
    setAlergias(p.alergias ?? "");
    setMedicamentos(p.medicamentos ?? "");
    setAntecedentes(p.antecedentes_medicos ?? "");
    setNotas(dataNotas.notas ?? []);
    setCargando(false);
  }

  useEffect(() => {
    if (Number.isInteger(pacienteId)) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  async function guardarCambios() {
    setGuardando(true);
    setGuardado(false);
    await fetch(`/api/pacientes/${pacienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        telefono: telefono || null,
        email: email || null,
        fecha_nacimiento: fechaNacimiento || null,
        alergias: alergias || null,
        medicamentos: medicamentos || null,
        antecedentes_medicos: antecedentes || null,
      }),
    });
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  async function agregarNota() {
    if (!tipoNota.trim() || guardandoNota) return;
    setGuardandoNota(true);
    await fetch(`/api/pacientes/${pacienteId}/notas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: tipoNota, nota: textoNota || null }),
    });
    setTipoNota("");
    setTextoNota("");
    setFormNotaAbierto(false);
    setGuardandoNota(false);
    const res = await fetch(`/api/pacientes/${pacienteId}/notas`);
    const data = await res.json();
    setNotas(data.notas ?? []);
  }

  async function compartirLink() {
    if (enviandoLink || !paciente) return;
    setEnviandoLink(true);
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/historial-token`);
      const data = await res.json();
      if (!data.token) return;

      const url = `${window.location.origin}/formulario/${data.token}`;
      const texto = `Hola ${paciente.nombre.split(" ")[0]}, antes de tu cita completa tu historia clínica aquí: ${url}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: "Historia clínica — SonrisApp", text: texto, url });
        } catch {
          // el usuario canceló el share, no hacer nada
        }
      } else {
        await navigator.clipboard.writeText(texto);
        setLinkCopiado(true);
        setTimeout(() => setLinkCopiado(false), 2500);
      }
    } finally {
      setEnviandoLink(false);
    }
  }

  if (cargando || !paciente) {
    return <p className="mx-4 mt-6 text-sm text-[#8a8272]">Cargando…</p>;
  }

  return (
    <div className="mx-4 mt-2 space-y-4 pb-6">
      <Link href="/dashboard/pacientes" className="inline-flex items-center gap-1 text-sm text-[#8a8272]">
        <ChevronLeft size={15} /> Pacientes
      </Link>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div>
          <h2 className="text-lg font-bold text-[#2b2118]" style={{ fontFamily: "Georgia, serif" }}>
            {paciente.nombre}
          </h2>
          <div className="text-xs text-[#a49c8a]">{paciente.folio}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/dashboard/pacientes/${paciente.id}/historia-clinica`}
            className="flex items-center gap-1.5 rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2b2118]"
          >
            <ClipboardList size={13} /> Historia clínica
          </Link>
          <Link
            href={`/dashboard/lealtad/${paciente.id}`}
            className="flex items-center gap-1.5 rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2b2118]"
          >
            <CreditCard size={13} /> Lealtad
          </Link>
          <button
            onClick={compartirLink}
            disabled={enviandoLink}
            className="flex items-center gap-1.5 rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2b2118] disabled:opacity-50"
          >
            <Share2 size={13} /> {linkCopiado ? "Link copiado ✓" : "Enviar link para llenar historial"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Nombre completo</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-[#a49c8a]">Teléfono</label>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#a49c8a]">Fecha de nacimiento</label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
          Antecedentes médicos
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Alergias</label>
            <textarea
              value={alergias}
              onChange={(e) => setAlergias(e.target.value)}
              rows={2}
              placeholder="Ej. penicilina, látex…"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Medicamentos actuales</label>
            <textarea
              value={medicamentos}
              onChange={(e) => setMedicamentos(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Otros antecedentes</label>
            <textarea
              value={antecedentes}
              onChange={(e) => setAntecedentes(e.target.value)}
              rows={2}
              placeholder="Diabetes, hipertensión, embarazo, etc."
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
        </div>

        <button
          onClick={guardarCambios}
          disabled={guardando}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          <Save size={14} /> {guardando ? "Guardando…" : guardado ? "Guardado ✓" : "Guardar cambios"}
        </button>
      </div>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
            Historial clínico general
          </div>
          <span className="text-[11px] text-[#a49c8a]">{notas.length} entrada{notas.length === 1 ? "" : "s"}</span>
        </div>

        <div className="space-y-3">
          {notas.length === 0 ? (
            <p className="text-sm text-[#8a8272]">Sin entradas todavía.</p>
          ) : (
            notas.map((n) => (
              <div key={n.id} className="border-l-2 border-[#EFE9DC] pl-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#2b2118]">{n.tipo}</span>
                  <span className="text-[11px] text-[#a49c8a]">{formatearFecha(n.fecha)}</span>
                </div>
                {n.nota && <p className="mt-0.5 text-[13px] text-[#8a8272]">{n.nota}</p>}
              </div>
            ))
          )}
        </div>

        {formNotaAbierto ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
            <input
              value={tipoNota}
              onChange={(e) => setTipoNota(e.target.value)}
              placeholder="Tipo (ej. Consulta, Diagnóstico)"
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
            <textarea
              value={textoNota}
              onChange={(e) => setTextoNota(e.target.value)}
              placeholder="Nota (opcional)"
              rows={2}
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
            <div className="flex gap-2">
              <button
                onClick={agregarNota}
                disabled={!tipoNota.trim() || guardandoNota}
                className="flex-1 rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {guardandoNota ? "Guardando…" : "Guardar"}
              </button>
              <button
                onClick={() => setFormNotaAbierto(false)}
                className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setFormNotaAbierto(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#EFE9DC] bg-white py-2.5 text-[13px] font-semibold text-[#2b2118]"
          >
            <Plus size={14} /> Agregar entrada al historial
          </button>
        )}
      </div>

      <Odontograma paciente={paciente} />
    </div>
  );
}
