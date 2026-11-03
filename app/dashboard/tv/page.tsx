"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Tv, Smile, Heart, EyeOff, ExternalLink, ChevronLeft, ChevronRight, Pause, Play, Lightbulb } from "lucide-react";
import { CONSEJOS_HIGIENE } from "@/lib/consejos-higiene";
import type { Cita, Paciente } from "@/lib/types";

function horaDe(fechaHora: string) {
  return new Date(fechaHora).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function ControlTv() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState<Paciente | null>(null);
  const [actual, setActual] = useState<{ modo: string; nombres: string[]; origen?: string; consejos?: boolean; consejoIdx?: number; consejoFijo?: boolean } | null>(null);
  const [listaConsejos, setListaConsejos] = useState(false);
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

  async function control(cuerpo: Record<string, unknown>) {
    await fetch("/api/tv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "consejo", ...cuerpo }),
    });
    const r = await fetch("/api/tv").catch(() => null);
    if (r?.ok) setActual(await r.json());
  }

  async function alternarConsejos() {
    const nuevo = !(actual?.consejos ?? true);
    const res = await fetch("/api/tv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consejos: nuevo }),
    });
    if (res.ok) setActual((a) => (a ? { ...a, consejos: nuevo } : a));
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
    const leerTv = () =>
      fetch("/api/tv")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setActual(d))
        .catch(() => {});
    leerTv();
    const t = setInterval(leerTv, 4000);
    return () => clearInterval(t);
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
        {linkTv && (
          <p className="break-all text-[11px] text-[#a49c8a]">
            Para un iPad o TV viejo (iOS 12, por ejemplo) usa este otro:{" "}
            <span className="text-[#2b2118]">{linkTv.replace("/tv?clave=", "/ligera/sala?clave=")}</span>
          </p>
        )}
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
              : actual?.consejos === false ? "Logo de la clínica" : "Consejos de higiene bucal"}{" "}
          <span className="font-normal text-[#a49c8a]">({actual?.origen === "manual" ? "elegido a mano" : "según la agenda"})</span>
        </b>
      </div>

      <div className="space-y-3 rounded-2xl border border-[#E3C3C9] bg-[#F5E7E9]/60 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#7A1E33]">
          <Lightbulb size={13} /> Control remoto · consejos
        </div>
        {actual?.consejos === false ? (
          <p className="text-[13px] text-[#8a8272]">Los consejos están apagados. Enciéndelos abajo para controlarlos desde aquí.</p>
        ) : (
          <>
            <div>
              <div className="text-[11px] text-[#8a8272]">
                Consejo {(actual?.consejoIdx ?? 0) + 1} de {CONSEJOS_HIGIENE.length}
                {actual?.consejoFijo ? " · en pausa" : " · rotando solo"}
                {actual && actual.modo !== "espera" ? " · (ahora la TV muestra a un paciente)" : ""}
              </div>
              <div className="text-sm font-semibold text-[#2b2118]">
                {CONSEJOS_HIGIENE[(actual?.consejoIdx ?? 0) % CONSEJOS_HIGIENE.length].titulo}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => control({ paso: -1 })}
                className="flex items-center justify-center gap-1 rounded-xl border border-[#EFE9DC] bg-white py-3 text-sm font-semibold text-[#2b2118]"
              >
                <ChevronLeft size={18} /> Anterior
              </button>
              <button
                onClick={() => control({ fijo: !actual?.consejoFijo })}
                className="flex items-center justify-center gap-1 rounded-xl bg-[#7A1E33] py-3 text-sm font-semibold text-white"
              >
                {actual?.consejoFijo ? (
                  <>
                    <Play size={16} /> Seguir
                  </>
                ) : (
                  <>
                    <Pause size={16} /> Pausar
                  </>
                )}
              </button>
              <button
                onClick={() => control({ paso: 1 })}
                className="flex items-center justify-center gap-1 rounded-xl border border-[#EFE9DC] bg-white py-3 text-sm font-semibold text-[#2b2118]"
              >
                Siguiente <ChevronRight size={18} />
              </button>
            </div>
            <button onClick={() => setListaConsejos((v) => !v)} className="text-[12px] font-medium text-[#7A1E33] underline underline-offset-2">
              {listaConsejos ? "Ocultar lista" : "Elegir un consejo de la lista"}
            </button>
            {listaConsejos && (
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl bg-white p-1">
                {CONSEJOS_HIGIENE.map((c, i) => (
                  <button
                    key={c.titulo}
                    onClick={() => control({ indice: i, fijo: true })}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] ${
                      i === actual?.consejoIdx ? "bg-[#F5E7E9] font-semibold text-[#7A1E33]" : "text-[#2b2118]"
                    }`}
                  >
                    {i + 1}. {c.titulo}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-[#EFE9DC] bg-white/70 p-3 text-sm">
        <input
          type="checkbox"
          checked={actual?.consejos ?? true}
          onChange={alternarConsejos}
          className="mt-0.5 h-4 w-4 accent-[#7A1E33]"
        />
        <span>
          <b className="text-[#2b2118]">Mostrar consejos de higiene bucal</b>
          <span className="block text-[12px] text-[#8a8272]">
            Cuando no hay un paciente al que saludar, la TV va rotando consejos de cuidado dental (cepillado, hilo dental, revisiones…).
          </span>
        </span>
      </label>

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
