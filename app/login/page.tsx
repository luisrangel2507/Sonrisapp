"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [next, setNext] = useState("/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/dashboard");
  }, []);

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
      router.push(next);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-5 py-10"
      style={{ background: "radial-gradient(circle at 50% 0%, #FBE4D0 0%, #F5F1EA 55%, #F5F1EA 100%)" }}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-[26px] border bg-white"
        style={{
          borderColor: "#EFE9DC",
          boxShadow: "0 20px 50px -20px rgba(201,111,59,0.35)",
        }}
      >
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #E8508C 0%, #C96F3B 100%)" }} />

        <div className="flex items-center justify-between px-5 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C96F3B]">
            Sistema del consultorio
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#E8508C] shadow-[0_0_6px_1px_rgba(232,80,140,0.5)]" />
        </div>

        <div className="flex flex-col items-center gap-2.5 px-6 pb-1 pt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-vina-sonrisas.png" alt="Viña Sonrisas" className="h-auto w-60" />
          <p className="text-[12px] text-[#a49c8a]">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={entrar} className="space-y-4 px-6 pb-7 pt-5">
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
              className="w-full rounded-xl border border-[#EFE9DC] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#2b2118] outline-none placeholder:text-[#a49c8a] focus:border-[#C96F3B]"
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
              className="w-full rounded-xl border border-[#EFE9DC] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#2b2118] outline-none placeholder:text-[#a49c8a] focus:border-[#C96F3B]"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-[12px] font-medium text-[#B0503A]">{error}</p>}

          <button
            type="submit"
            disabled={cargando || !usuario || !contrasena}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #E8508C 0%, #C96F3B 130%)" }}
          >
            <LogIn size={15} /> {cargando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
