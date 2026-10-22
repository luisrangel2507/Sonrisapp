"use client";

import { useEffect, useState } from "react";

interface EstadoTv {
  modo: "espera" | "bienvenida" | "gracias";
  nombre: string | null;
}

// Pantalla para la TV de la sala de espera: se abre una vez en la TV (con
// la sesión iniciada) y se actualiza sola según lo que se elija en
// /dashboard/tv. Solo muestra el nombre de pila.
export default function PaginaTv() {
  const [estado, setEstado] = useState<EstadoTv>({ modo: "espera", nombre: null });
  const [sinSesion, setSinSesion] = useState(false);

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

  const primerNombre = estado.nombre?.trim().split(/\s+/)[0] ?? "";

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center bg-[#F5F1EA] px-8 text-center text-[#2b2118]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-vina-sonrisas.webp" alt="Viña Sonrisas" className="mb-10 h-auto w-[min(60vw,520px)]" />
      {sinSesion ? (
        <a href="/login?next=/tv" className="text-2xl text-[#803449] underline">
          Inicia sesión para activar la pantalla
        </a>
      ) : estado.modo === "bienvenida" && primerNombre ? (
        <div key={`b-${primerNombre}`} className="animate-[fadein_.8s_ease]">
          <p className="text-[clamp(1.5rem,3.5vw,3rem)] font-light tracking-wide text-[#8a8272]">Bienvenido(a)</p>
          <h1 className="mt-2 font-serif text-[clamp(3.5rem,11vw,10rem)] font-semibold leading-none text-[#803449]">
            {primerNombre}
          </h1>
          <p className="mt-8 text-[clamp(1.2rem,2.5vw,2.2rem)] text-[#8a8272]">Es un gusto tenerte en Viña Sonrisas</p>
        </div>
      ) : estado.modo === "gracias" && primerNombre ? (
        <div key={`g-${primerNombre}`} className="animate-[fadein_.8s_ease]">
          <p className="text-[clamp(1.5rem,3.5vw,3rem)] font-light tracking-wide text-[#8a8272]">Gracias por tu visita</p>
          <h1 className="mt-2 font-serif text-[clamp(3.5rem,11vw,10rem)] font-semibold leading-none text-[#803449]">
            {primerNombre}
          </h1>
          <p className="mt-8 text-[clamp(1.2rem,2.5vw,2.2rem)] text-[#8a8272]">¡Cuida tu sonrisa, te esperamos pronto!</p>
        </div>
      ) : (
        <p className="text-[clamp(1.5rem,3vw,2.5rem)] font-light tracking-wide text-[#8a8272]">
          Odontología Estética
        </p>
      )}
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
    </main>
  );
}
