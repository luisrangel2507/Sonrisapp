"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ScanFace } from "lucide-react";
import { startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { PantallaCarga } from "@/components/PantallaCarga";
import { LLAVE_PASSKEY_ID } from "@/lib/webauthn-client";

const DURACION_PANTALLA_CARGA_MS = 4000;

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mostrarCarga, setMostrarCarga] = useState(false);
  const [next, setNext] = useState("/dashboard");
  const [faceIdDisponible, setFaceIdDisponible] = useState(false);
  const [faceIdCargando, setFaceIdCargando] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/dashboard");
    setFaceIdDisponible(browserSupportsWebAuthn());
  }, []);

  function entrarYRedirigir() {
    setMostrarCarga(true);
    setTimeout(() => {
      router.push(next);
    }, DURACION_PANTALLA_CARGA_MS);
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasena }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo iniciar sesión.");
        setCargando(false);
        return;
      }
      entrarYRedirigir();
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
      setCargando(false);
    }
  }

  async function entrarConFaceId() {
    if (faceIdCargando) return;
    setFaceIdCargando(true);
    setError(null);
    try {
      const credIdGuardado = localStorage.getItem(LLAVE_PASSKEY_ID);
      const url = credIdGuardado
        ? `/api/auth/webauthn/login/opciones?credId=${encodeURIComponent(credIdGuardado)}`
        : "/api/auth/webauthn/login/opciones";
      const resOpciones = await fetch(url);
      const opciones = await resOpciones.json();
      const credencial = await startAuthentication({ optionsJSON: opciones });

      const resVerificar = await fetch("/api/auth/webauthn/login/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credencial }),
      });
      const data = await resVerificar.json().catch(() => ({}));
      if (!resVerificar.ok) throw new Error(data.error || "No se pudo entrar con Face ID.");

      // Recuerda con qué credencial se entró en este navegador, para
      // que la próxima vez salte directo al Face ID sin el selector.
      try {
        localStorage.setItem(LLAVE_PASSKEY_ID, credencial.id);
      } catch {}

      entrarYRedirigir();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar con Face ID.");
      setFaceIdCargando(false);
    }
  }

  if (mostrarCarga) {
    return <PantallaCarga />;
  }

  return (
    <div className="relative min-h-dvh">
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center [background-image:url('/login-bg.jpg')] md:[background-image:url('/login-bg-desktop.jpg')]"
        style={{ backgroundColor: "#3B0F1C" }}
      />
      <div className="flex min-h-dvh items-center justify-center px-5 py-10">
        <div
          className="w-full max-w-sm overflow-hidden rounded-[26px] border bg-white"
          style={{
            borderColor: "#EFE9DC",
            boxShadow: "0 20px 50px -20px rgba(128,52,73,0.35)",
          }}
        >
          <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #B2485F 0%, #803449 100%)" }} />

          <div className="flex items-center justify-between px-5 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#803449]">
              Consultorio 24/7
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#B2485F] shadow-[0_0_6px_1px_rgba(178,72,95,0.5)]" />
          </div>

          <div className="flex flex-col items-center gap-2.5 px-6 pb-1 pt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-vina-sonrisas.png" alt="Viña Sonrisas" className="h-auto w-60" />
            <p className="text-[12px] text-[#a49c8a]">Inicia sesión para continuar</p>
          </div>

          {faceIdDisponible && (
            <div className="px-6 pb-1 pt-4">
              <button
                type="button"
                onClick={entrarConFaceId}
                disabled={faceIdCargando || cargando}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#803449] py-3 text-[14px] font-semibold text-[#803449] transition-opacity disabled:opacity-50"
              >
                <ScanFace size={16} /> {faceIdCargando ? "Verificando…" : "Entrar con Face ID"}
              </button>
              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#EFE9DC]" />
                <span className="text-[11px] text-[#a49c8a]">o con tu usuario</span>
                <span className="h-px flex-1 bg-[#EFE9DC]" />
              </div>
            </div>
          )}

          <form onSubmit={entrar} className={`space-y-4 px-6 pb-7 ${faceIdDisponible ? "pt-0" : "pt-5"}`}>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
                Usuario
              </label>
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                className="w-full rounded-xl border border-[#EFE9DC] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#2b2118] outline-none placeholder:text-[#a49c8a] focus:border-[#803449]"
                placeholder="usuario"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
                Contraseña
              </label>
              <input
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="current-password"
                className="w-full rounded-xl border border-[#EFE9DC] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#2b2118] outline-none placeholder:text-[#a49c8a] focus:border-[#803449]"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-[12px] font-medium text-[#B0503A]">{error}</p>}

            <button
              type="submit"
              disabled={cargando || !usuario || !contrasena}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #B2485F 0%, #803449 130%)" }}
            >
              <LogIn size={15} /> {cargando ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
