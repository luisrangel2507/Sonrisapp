"use client";

import { useEffect, useState } from "react";

interface EstadoTv {
  modo: "espera" | "bienvenida" | "gracias";
  nombres: string[];
  hora?: string | null;
}

// Pantalla para la TV de la sala de espera: se abre una vez en la TV (con
// la sesión iniciada) y se actualiza sola según la agenda o lo que se elija
// en /dashboard/tv. Solo muestra el nombre de pila. El fondo (/tv-fondo.jpg)
// ya trae el logo y el recuadro; aquí se escribe el texto encima, con medidas
// en % del cuadro para que se vea igual en cualquier TV.
export default function PaginaTv() {
  const [estado, setEstado] = useState<EstadoTv>({ modo: "espera", nombres: [] });
  const [sinSesion, setSinSesion] = useState(false);
  const [ahora, setAhora] = useState("");

  useEffect(() => {
    let activo = true;
    async function leer() {
      try {
        const res = await fetch("/api/tv", { cache: "no-store" });
        if (!activo) return;
        if (res.status === 401) {
          setSinSesion(true);
          return;
        }
        if (res.ok) {
          setSinSesion(false);
          setEstado(await res.json());
        }
      } catch {
        // sin red: se queda lo último que se mostró
      }
    }
    leer();
    const t = setInterval(leer, 3000);
    return () => {
      activo = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const poner = () =>
      setAhora(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }));
    poner();
    const t = setInterval(poner, 15000);
    return () => clearInterval(t);
  }, []);

  const pilas = [...new Set((estado.nombres ?? []).map((n) => n.trim().split(/\s+/)[0]).filter(Boolean))];
  const nombre = pilas.length <= 1 ? (pilas[0] ?? "") : `${pilas.slice(0, -1).join(", ")} y ${pilas[pilas.length - 1]}`;

  const bienvenida = estado.modo === "bienvenida" && nombre;
  const gracias = estado.modo === "gracias" && nombre;
  const hora = bienvenida ? (estado.hora ?? ahora) : ahora;

  const titulo = bienvenida ? nombre : gracias ? nombre : "Bienvenido(a)";
  const subtitulo = bienvenida
    ? "Es un gusto poder atenderte."
    : gracias
      ? "Gracias por tu visita."
      : "Es un gusto poder atenderte.";
  const etiqueta = bienvenida ? "Tu cita es a las:" : gracias ? "¡Cuida tu sonrisa, te esperamos pronto!" : "Hora:";

  // Letra del nombre: más chica si es largo.
  const tamNombre = Math.min(5.2, 60 / Math.max(titulo.length, 10));

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-[#F0E6DC]">
      <div
        className="relative aspect-video"
        style={{ width: "min(100vw, 177.78vh)", containerType: "inline-size" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tv-fondo.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />

        <div className="absolute inset-x-0 text-center" style={{ top: "30%" }}>
          <div
            key={`${estado.modo}-${titulo}`}
            className="font-serif font-semibold leading-none text-[#7A1E33]"
            style={{ fontSize: `${tamNombre}cqw`, animation: "fadein .8s ease" }}
          >
            {titulo}
          </div>
        </div>
        <div className="absolute inset-x-0 text-center text-[#7a6f62]" style={{ top: "39.5%", fontSize: "2.3cqw" }}>
          {subtitulo}
        </div>

        {!gracias && (
          <div className="absolute inset-x-0 text-center text-[#7a6f62]" style={{ top: "44.5%", fontSize: "1.8cqw" }}>
            {etiqueta}
          </div>
        )}

        <div
          className="absolute flex items-center justify-center font-serif text-[#7A1E33]"
          style={{ left: "29%", width: "46%", top: "50.5%", height: "23%" }}
        >
          {gracias ? (
            <span className="text-center" style={{ fontSize: "3.2cqw", lineHeight: 1.2 }}>
              {etiqueta}
            </span>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: "6cqw", height: "6cqw" }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" strokeLinecap="round" />
              </svg>
              <span className="mx-[2.2cqw] h-[8cqw] w-px bg-[#7A1E33]/25" />
              <span style={{ fontSize: "8.5cqw", lineHeight: 1 }}>{hora}</span>
            </>
          )}
        </div>

        {sinSesion && (
          <a
            href="/login?next=/tv"
            className="absolute inset-x-0 text-center text-[2.5cqw] text-[#7A1E33] underline"
            style={{ top: "80%" }}
          >
            Inicia sesión para activar la pantalla
          </a>
        )}
      </div>
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
    </main>
  );
}
