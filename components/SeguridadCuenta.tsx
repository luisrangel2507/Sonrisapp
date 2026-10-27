"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, LogOut, Copy } from "lucide-react";

// Perfil → Seguridad: verificación en dos pasos de la cuenta con la que
// se entró y (solo admin) cerrar todas las sesiones abiertas.
export function SeguridadCuenta({ esAdmin }: { esAdmin: boolean }) {
  const [activo, setActivo] = useState<boolean | null>(null);
  const [alta, setAlta] = useState<{ secreto: string; uri: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [desactivando, setDesactivando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/dos-pasos")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setActivo(Boolean(d?.activo)))
      .catch(() => setActivo(false));
  }, []);

  async function llamar(accion: string) {
    setError("");
    setAviso("");
    const res = await fetch("/api/auth/dos-pasos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, codigo }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error ?? "No se pudo completar.");
      return null;
    }
    return d;
  }

  async function iniciar() {
    const d = await llamar("iniciar");
    if (d) setAlta(d);
  }

  async function confirmar() {
    const d = await llamar("confirmar");
    if (d) {
      setActivo(true);
      setAlta(null);
      setCodigo("");
      setAviso("Listo: a partir de ahora se te pedirá el código al entrar con contraseña.");
    }
  }

  async function desactivar() {
    const d = await llamar("desactivar");
    if (d) {
      setActivo(false);
      setDesactivando(false);
      setCodigo("");
      setAviso("Verificación en dos pasos desactivada.");
    }
  }

  async function cerrarTodas() {
    if (!window.confirm("Se cerrará la sesión en TODOS los dispositivos, incluido este. ¿Continuar?")) return;
    const res = await fetch("/api/auth/cerrar-sesiones", { method: "POST" });
    if (res.ok) window.location.href = "/login";
    else setError("No se pudieron cerrar las sesiones.");
  }

  const campoCodigo = (
    <input
      value={codigo}
      onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="Código de 6 dígitos"
      className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-center tracking-[0.3em] outline-none focus:border-[#803449]"
    />
  );

  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#803449]">
        <ShieldCheck size={13} /> Seguridad
      </div>

      <div className="mt-3 text-sm font-semibold text-[#2b2118]">Verificación en dos pasos</div>
      <p className="mb-3 mt-1 text-[12px] text-[#a49c8a]">
        Además de la contraseña, al entrar se pide un código de 6 dígitos de una app como Google Authenticator o las
        Contraseñas del iPhone. Face ID no lo pide.
      </p>

      {activo === null ? null : activo && !desactivando ? (
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-[#EEF4EA] px-3 py-1 text-[12px] font-semibold text-[#3F6B33]">Activada</span>
          <button onClick={() => setDesactivando(true)} className="text-[12px] font-medium text-[#B0503A]">
            Desactivar
          </button>
        </div>
      ) : activo && desactivando ? (
        <div className="space-y-2">
          {campoCodigo}
          <button
            onClick={desactivar}
            disabled={codigo.length !== 6}
            className="w-full rounded-full border border-[#EFE9DC] bg-white py-2.5 text-[13px] font-semibold text-[#B0503A] disabled:opacity-50"
          >
            Confirmar desactivación
          </button>
        </div>
      ) : alta ? (
        <div className="space-y-2">
          <p className="text-[12px] text-[#6f6458]">
            1. Toca <b>Agregar a mi app</b> (en el celular) o copia la clave en tu app de autenticación.
          </p>
          <a href={alta.uri} className="btn-vino block rounded-full py-2.5 text-center text-[13px] font-semibold">
            Agregar a mi app
          </a>
          <button
            onClick={() => navigator.clipboard?.writeText(alta.secreto)}
            className="flex w-full items-center justify-center gap-1.5 break-all rounded-xl bg-[#FBF9F5] px-3 py-2 font-mono text-[12px] text-[#2b2118]"
          >
            <Copy size={12} className="shrink-0" /> {alta.secreto}
          </button>
          <p className="text-[12px] text-[#6f6458]">2. Escribe el código que te muestra para activarla:</p>
          {campoCodigo}
          <button
            onClick={confirmar}
            disabled={codigo.length !== 6}
            className="btn-vino w-full rounded-full py-2.5 text-[13px] font-semibold disabled:opacity-50"
          >
            Activar
          </button>
        </div>
      ) : (
        <button onClick={iniciar} className="btn-vino w-full rounded-full py-2.5 text-[13px] font-semibold">
          Activar verificación en dos pasos
        </button>
      )}

      {esAdmin && (
        <>
          <div className="mt-5 text-sm font-semibold text-[#2b2118]">Sesiones abiertas</div>
          <p className="mb-3 mt-1 text-[12px] text-[#a49c8a]">
            Si se pierde un celular o crees que alguien entró, saca a todos los dispositivos al momento.
          </p>
          <button
            onClick={cerrarTodas}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#EFE9DC] bg-white py-2.5 text-[13px] font-semibold text-[#B0503A]"
          >
            <LogOut size={14} /> Cerrar todas las sesiones
          </button>
        </>
      )}

      {aviso && <p className="mt-3 text-[12px] text-[#3F6B33]">{aviso}</p>}
      {error && <p className="mt-3 text-[12px] text-[#B0503A]">{error}</p>}
    </div>
  );
}
