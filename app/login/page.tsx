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
      className="flex min-h-screen items-center justify-center px-5 py-10"
      style={{ background: "radial-gradient(circle at 50% 15%, #241a30 0%, #150f1f 45%, #0a0714 100%)" }}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border"
        style={{
          borderColor: "rgba(244,114,182,0.3)",
          background: "rgba(21,16,31,0.95)",
          boxShadow: "0 0 40px rgba(232,80,140,0.15)",
        }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F5A6C9]/70">
            Sistema del consultorio
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#F5A6C9] shadow-[0_0_6px_1px_rgba(245,166,201,0.6)]" />
        </div>

        <div className="flex flex-col items-center gap-2.5 px-6 pb-1 pt-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="SonrisApp"
            className="h-14 w-14 rounded-2xl"
            style={{ boxShadow: "0 0 20px rgba(232,80,140,0.3)" }}
          />
          <h1 className="text-[20px] leading-none" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            <span className="font-bold text-white">Sonris</span>
            <span className="font-bold italic text-[#F5A6C9]">App</span>
          </h1>
          <p className="text-[12px] text-white/40">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={entrar} className="space-y-4 px-6 pb-7 pt-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/50">
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
              className="w-full rounded-xl border border-[#F5A6C9]/25 bg-[#0f0a17] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#F5A6C9]/70"
              placeholder="usuario"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/50">
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
              className="w-full rounded-xl border border-[#F5A6C9]/25 bg-[#0f0a17] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#F5A6C9]/70"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-[12px] font-medium text-[#F5749C]">{error}</p>}

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
