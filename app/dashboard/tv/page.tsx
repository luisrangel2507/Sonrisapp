"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Tv, Smile, Heart, EyeOff, ExternalLink } from "lucide-react";
import type { Cita, Paciente } from "@/lib/types";

function horaDe(fechaHora: string) {
  return new Date(fechaHora).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function ControlTv() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState<Paciente | null>(null);
  const [actual, setActual] = useState<{ modo: string; nombres: string[]; origen?: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [citasHoy, setCitasHoy] = useState<Cita[]>([]);
  const [otroAbierto, setOtroAbierto] = useState(false);
  const [linkTv, setLinkTv] = useState<string | null>(null);
  const [avisoTv, setAvisoTv] = useState("");

  async function vincularTv() {
    const res = await fetch("/api/tv/vincular", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setAvisoTv(d.error ?? "No se pudo generar el link.");
    const url = `${window.location.origin}/tv?clave=${d.clave}`;
    setLinkTv(url);
    try {
      await navigator.clipboard.writeText(url);
      setAvisoTv("Link copiado. Ábrelo una vez en el navegador de la TV.");
    } catch {
      setAvisoTv("Abre este link una vez en el navegador de la TV.");
    }
  }

  async function desvincularTvs() {
    if (!window.confirm("¿Desvincular todas las TVs? Tendrás que volver a abrir el link en cada una.")) return;
    const res = await fetch("/api/tv/desvincular", { method: "POST" });
    setLinkTv(null);
    setAvisoTv(res.ok ? "Listo: todas las TVs quedaron desvinculadas." : "No se pudo desvincular.");
  }

  useEffect(() => {
    fetch("/api/pacientes")
      .then((r) => (r.ok ? r.json() : { pacientes: [] }))
      .then((d) => setPacientes(d.pacientes ?? []))
      .catch(() => {});
    fetch("/api/citas")
      .then((r) => (r.ok ? r.json() : { citas: [] }))
      .then((d) => {
        const hoy = new Date().toDateString();
        const lista = ((d.citas ?? []) as Cita[])
          .filter((c) => new Date(c.fecha_hora).toDateString() === hoy && c.estado !== "cancelada" && !c.pendiente_aprobacion)
          .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
        setCitasHoy(lista);
      })
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
        .filter((p) => p.nombre?.trim() && norm(p.nombre).includes(norm(busqueda.trim()))),
    [pacientes, busqueda]
  );

  async function mostrar(modo: "bienvenida" | "gracias" | "espera", nombreCita?: string, hora?: string) {
    const quien = nombreCita ?? elegido?.nombre;
    if (modo !== "espera" && !quien) return;
    setEnviando(true);
    try {
      const nombre = modo === "espera" ? null : quien!;
      const res = await fetch("/api/tv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo, nombre, hora }),
      });
      if (res.ok) setActual({ modo, nombres: nombre ? [nombre] : [], origen: modo === "espera" ? "agenda" : "manual" });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 md:px-0">
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
        Toca <b>Vincular TV</b> y abre ese link una vez en el navegador de la TV. La TV saluda sola al paciente
        que sigue con cita agendada hoy y, cuando ya no queda ninguno, agradece al último que se atendió. Los botones
        sirven para forzarlo a mano por 10 minutos. Solo se muestra el nombre de pila.
      </p>

      <div className="space-y-2 rounded-2xl border border-[#EFE9DC] bg-white/70 p-3 text-sm">
        <div className="flex gap-2">
          <button onClick={vincularTv} className="btn-vino flex-1 rounded-full py-2 text-[13px] font-semibold">
            Vincular TV
          </button>
          <button
            onClick={desvincularTvs}
            className="flex-1 rounded-full border border-[#EFE9DC] bg-white py-2 text-[13px] font-semibold text-[#B0503A]"
          >
            Desvincular TVs
          </button>
        </div>
        {avisoTv && <p className="text-[12px] text-[#8a8272]">{avisoTv}</p>}
        {linkTv && <p className="break-all rounded-xl bg-[#FBF9F5] p-2 text-[11px] text-[#2b2118]">{linkTv}</p>}
        <p className="text-[11px] text-[#a49c8a]">
          La TV vinculada solo puede ver esta pantalla, no el resto del panel. No inicies sesión en la TV.
        </p>
      </div>

      <div className="rounded-2xl border border-[#EFE9DC] bg-white/70 p-3 text-sm">
        En pantalla ahora:{" "}
        <b>
          {actual?.modo === "bienvenida"
            ? `Bienvenida a ${actual.nombres.map((n) => n.split(" ")[0]).join(", ")}`
            : actual?.modo === "gracias"
              ? `Agradecimiento a ${actual.nombres.map((n) => n.split(" ")[0]).join(", ")}`
              : "Logo de la clínica"}{" "}
          <span className="font-normal text-[#a49c8a]">({actual?.origen === "manual" ? "elegido a mano" : "según la agenda"})</span>
        </b>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[#2b2118]">Citas de hoy</h2>
        {citasHoy.length === 0 && (
          <p className="rounded-2xl border border-[#EFE9DC] bg-white/70 p-3 text-sm text-[#a49c8a]">
            No hay citas para hoy.
          </p>
        )}
        {citasHoy.map((c) => (
          <div key={c.id} className="rounded-2xl border border-[#EFE9DC] bg-white p-3 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-[#2b2118]">{c.paciente_nombre}</span>
              <span className="shrink-0 text-xs text-[#803449]">
                {new Date(c.fecha_hora).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
            <div className="text-xs text-[#a49c8a]">{c.tratamiento}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                disabled={enviando}
                onClick={() => mostrar("bienvenida", c.paciente_nombre, horaDe(c.fecha_hora))}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#803449] px-2 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Smile size={15} /> Bienvenida
              </button>
              <button
                disabled={enviando}
                onClick={() => mostrar("gracias", c.paciente_nombre, horaDe(c.fecha_hora))}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#3F6B33] px-2 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Heart size={15} /> Gracias
              </button>
            </div>
          </div>
        ))}
        <button
          disabled={enviando}
          onClick={() => mostrar("espera")}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#EFE9DC] bg-white px-2 py-2.5 text-sm font-semibold text-[#2b2118] disabled:opacity-40"
        >
          <EyeOff size={16} /> Quitar de la pantalla
        </button>
      </div>

      <button
        onClick={() => setOtroAbierto((v) => !v)}
        className="w-full rounded-xl border border-dashed border-[#803449]/40 px-3 py-2 text-sm font-medium text-[#803449]"
      >
        {otroAbierto ? "Ocultar" : "Paciente sin cita hoy…"}
      </button>

      {otroAbierto && (
      <>
      <div className="sticky top-0 z-10 space-y-2 bg-[#F5F1EA] py-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar paciente…"
          className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2.5 text-base outline-none focus:border-[#803449]"
        />
        <div className="grid grid-cols-2 gap-2">
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
      </>
      )}
    </div>
  );
}
