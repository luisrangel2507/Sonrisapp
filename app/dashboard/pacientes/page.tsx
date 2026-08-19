"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight } from "lucide-react";
import type { Paciente } from "@/lib/types";
import { hoyISO } from "@/lib/fechas";

// Heurística: el nombre llega como texto libre ("Nombre(s) Apellidos"),
// así que se usa la última palabra como apellido para ordenar — no es
// perfecto con apellidos compuestos, pero es razonable sin separar el
// nombre en campos de nombre/apellido en la base de datos.
function apellidoParaOrdenar(nombreCompleto: string) {
  const partes = nombreCompleto.trim().split(/\s+/);
  return partes[partes.length - 1] ?? nombreCompleto;
}

export default function PacientesPage() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState<Paciente[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  async function cargar(q: string) {
    const res = await fetch(`/api/pacientes${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    setPacientes(data.pacientes ?? []);
  }

  useEffect(() => {
    const timeout = setTimeout(() => cargar(busqueda), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("nuevo") === "1") {
      setFormAbierto(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function crearPaciente() {
    if (!nombre.trim() || guardando) return;
    setGuardando(true);
    const res = await fetch("/api/pacientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        telefono: telefono || null,
        email: email || null,
        fecha_nacimiento: fechaNacimiento || null,
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (data.paciente?.id) router.push(`/dashboard/pacientes/${data.paciente.id}`);
  }

  const ordenados = useMemo(
    () =>
      [...(pacientes ?? [])].sort((a, b) =>
        apellidoParaOrdenar(a.nombre).localeCompare(apellidoParaOrdenar(b.nombre), "es", { sensitivity: "base" })
      ),
    [pacientes]
  );

  return (
    <>
      <div className="mx-4 mt-2 space-y-3">
        <div className="md:flex md:items-center md:gap-3">
          <div className="relative md:flex-1">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a49c8a]" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, folio o teléfono…"
              className="w-full rounded-full border border-[#EFE9DC] bg-white py-2.5 pl-10 pr-4 text-sm text-[#2b2118] outline-none focus:border-[#C96F3B]"
            />
          </div>

          {!formAbierto && (
            <button
              onClick={() => setFormAbierto(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3 text-[14px] font-semibold text-white md:mt-0 md:w-auto md:shrink-0 md:px-8"
            >
              <Plus size={15} /> Nuevo paciente
            </button>
          )}
        </div>

        {formAbierto && (
          <div className="space-y-2 rounded-3xl border border-[#EFE9DC] bg-white/70 p-4 md:max-w-md">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo *"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Teléfono (con WhatsApp)"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (opcional)"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
            <label className="block text-[11px] font-medium text-[#a49c8a]">Fecha de nacimiento</label>
            <input
              type="date"
              value={fechaNacimiento}
              max={hoyISO()}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={crearPaciente}
                disabled={!nombre.trim() || guardando}
                className="flex-1 rounded-full bg-[#2b2118] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Dar de alta"}
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
      </div>

      <div className="mx-4 mt-4">
        {pacientes === null ? (
          <p className="text-sm text-[#8a8272]">Cargando…</p>
        ) : pacientes.length === 0 ? (
          <p className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-sm text-[#8a8272]">
            {busqueda ? "Sin resultados." : "Aún no hay pacientes registrados."}
          </p>
        ) : (
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {ordenados.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/pacientes/${p.id}`}
                className="flex items-center justify-between rounded-2xl border border-[#EFE9DC] bg-white/70 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#2b2118]">{p.nombre}</div>
                  <div className="text-xs text-[#a49c8a]">
                    {p.folio} {p.telefono ? `· ${p.telefono}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold text-[#C96F3B]">{p.puntos} pts</span>
                  <ChevronRight size={16} className="text-[#a49c8a]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
