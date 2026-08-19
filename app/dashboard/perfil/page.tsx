"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, LogOut } from "lucide-react";
import { TRATAMIENTOS, DOCTORA } from "@/lib/panel-data";

export default function PerfilPage() {
  const router = useRouter();
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  async function cerrarSesion() {
    if (cerrandoSesion) return;
    setCerrandoSesion(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    fetch("/api/precios-servicios")
      .then((res) => res.json())
      .then((data) => {
        const mapa: Record<string, string> = {};
        for (const p of data.precios ?? []) {
          mapa[p.servicio] = p.precio != null ? String(p.precio) : "";
        }
        setPrecios(mapa);
        setCargando(false);
      });
  }, []);

  async function guardar() {
    setGuardando(true);
    setGuardado(false);
    await fetch("/api/precios-servicios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precios }),
    });
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  return (
    <div className="mx-4 mt-2 space-y-4 pb-10">
      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
          Perfil del dentista
        </div>
        <div className="mt-1 text-sm font-medium text-[#2b2118]">{DOCTORA.nombre}</div>
        <div className="text-xs text-[#a49c8a]">Cédula profesional: {DOCTORA.cedula}</div>
      </div>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#C96F3B]">
          Precios por servicio
        </div>
        <p className="mb-4 text-[12px] text-[#a49c8a]">
          Se usan para sugerir el monto al agendar una cita. Déjalo vacío si el precio varía caso por caso.
        </p>

        {cargando ? (
          <p className="text-sm text-[#8a8272]">Cargando…</p>
        ) : (
          <div className="space-y-3">
            {TRATAMIENTOS.map((servicio) => (
              <div key={servicio} className="flex items-center justify-between gap-3">
                <label className="text-sm text-[#2b2118]">{servicio}</label>
                <div className="relative w-32">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#a49c8a]">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={precios[servicio] ?? ""}
                    onChange={(e) => setPrecios((prev) => ({ ...prev, [servicio]: e.target.value }))}
                    placeholder="—"
                    className="w-full rounded-xl border border-[#EFE9DC] bg-white py-2 pl-6 pr-3 text-right text-sm outline-none focus:border-[#C96F3B]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={guardar}
          disabled={cargando || guardando}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          <Save size={15} /> {guardando ? "Guardando…" : guardado ? "Guardado ✓" : "Guardar precios"}
        </button>
      </div>

      <button
        onClick={cerrarSesion}
        disabled={cerrandoSesion}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-[#EFE9DC] bg-white/70 py-3 text-[14px] font-semibold text-[#B0503A] disabled:opacity-50"
      >
        <LogOut size={15} /> {cerrandoSesion ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
    </div>
  );
}
