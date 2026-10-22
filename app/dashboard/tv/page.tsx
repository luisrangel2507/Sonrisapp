"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Tv, Smile, Heart, EyeOff, ExternalLink } from "lucide-react";
import type { Paciente } from "@/lib/types";

export default function ControlTv() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState<Paciente | null>(null);
  const [actual, setActual] = useState<{ modo: string; nombre: string | null } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/pacientes")
      .then((r) => (r.ok ? r.json() : { pacientes: [] }))
      .then((d) => setPacientes(d.pacientes ?? []))
      .catch(() => {});
    fetch("/api/tv")
      .then((r) => (r.ok ? r.json() : null))
      .then(setActual)
      .catch(() => {});
  }, []);

  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const lista = useMemo(
    () =>
      [...pacientes]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }))
        .filter((p) => norm(p.nombre).includes(norm(busqueda.trim()))),
    [pacientes, busqueda]
  );

  async function mostrar(modo: "bienvenida" | "gracias" | "espera") {
    if (modo !== "espera" && !elegido) return;
    setEnviando(true);
    try {
      const nombre = modo === "espera" ? null : elegido!.nombre;
      const res = await fetch("/api/tv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo, nombre }),
      });
      if (res.ok) setActual({ modo, nombre });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-[#2b2118]">
          <Tv size={22} className="text-[#803449]" /> Pantalla de TV
        </h1>
        <Link
          href="/tv"
          target="_blank"
          className="flex items-center gap-1 rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-xs font-medium text-[#803449]"
        >
          Abrir pantalla <ExternalLink size={13} />
        </Link>
      </div>
      <p className="text-sm text-[#8a8272]">
        Abre <b>/tv</b> en el navegador de la TV (una sola vez, con la sesión iniciada). Aquí eliges a quién saludar o
        agradecer y la TV cambia sola. Solo se muestra el nombre de pila.
      </p>

      <div className="rounded-2xl border border-[#EFE9DC] bg-white/70 p-3 text-sm">
        En pantalla ahora:{" "}
        <b>
          {actual?.modo === "bienvenida"
            ? `Bienvenida a ${actual.nombre?.split(" ")[0]}`
            : actual?.modo === "gracias"
              ? `Agradecimiento a ${actual.nombre?.split(" ")[0]}`
              : "Logo de la clínica"}
        </b>
      </div>

      <div className="sticky top-0 z-10 space-y-2 bg-[#F5F1EA] py-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar paciente…"
          className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2.5 text-base outline-none focus:border-[#803449]"
        />
        <div className="grid grid-cols-3 gap-2">
          <button
            disabled={!elegido || enviando}
            onClick={() => mostrar("bienvenida")}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#803449] px-2 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Smile size={16} /> Bienvenida
          </button>
          <button
            disabled={!elegido || enviando}
            onClick={() => mostrar("gracias")}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#3F6B33] px-2 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Heart size={16} /> Gracias
          </button>
          <button
            disabled={enviando}
            onClick={() => mostrar("espera")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#EFE9DC] bg-white px-2 py-2.5 text-sm font-semibold text-[#2b2118] disabled:opacity-40"
          >
            <EyeOff size={16} /> Quitar
          </button>
        </div>
        <p className="text-xs text-[#a49c8a]">{elegido ? `Seleccionado: ${elegido.nombre}` : "Elige un paciente"}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {lista.map((p) => (
          <button
            key={p.id}
            onClick={() => setElegido(p)}
            className={`flex min-h-[64px] items-center justify-center rounded-2xl border bg-white p-3 text-center text-sm font-semibold leading-tight shadow-sm ${
              elegido?.id === p.id ? "border-[#803449] ring-2 ring-[#803449]/30" : "border-[#EFE9DC]"
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
