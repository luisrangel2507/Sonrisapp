"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Heart, LogIn } from "lucide-react";

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
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10"
      style={{ background: "radial-gradient(circle at 50% 20%, #2c1830 0%, #180f22 45%, #0a0714 100%)" }}
    >
      {/* destellos decorativos */}
      {[
        { top: "8%", left: "12%", size: 14, delay: "0s" },
        { top: "16%", left: "82%", size: 10, delay: "0.4s" },
        { top: "72%", left: "8%", size: 12, delay: "0.8s" },
        { top: "80%", left: "88%", size: 16, delay: "1.2s" },
        { top: "42%", left: "92%", size: 9, delay: "0.2s" },
      ].map((s, i) => (
        <Sparkles
          key={i}
          size={s.size}
          className="absolute animate-pulse text-[#F5A6C9]/50"
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
        />
      ))}

      <div
        className="relative w-full max-w-sm overflow-hidden rounded-[28px] border"
        style={{
          borderColor: "rgba(244,114,182,0.45)",
          background: "rgba(21,16,31,0.9)",
          boxShadow: "0 0 60px rgba(232,80,140,0.25), inset 0 0 40px rgba(232,80,140,0.06)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F5A6C9]/70">
            Consultorio activo
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#F5A6C9] shadow-[0_0_8px_2px_rgba(245,166,201,0.7)]" />
        </div>

        <div className="flex flex-col items-center gap-3 px-6 pb-2 pt-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="SonrisApp"
            className="h-16 w-16 rounded-2xl"
            style={{ boxShadow: "0 0 30px rgba(232,80,140,0.45)" }}
          />
          <h1 className="text-[22px] leading-none" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            <span className="font-bold text-white">Sonris</span>
            <span className="font-bold italic text-[#F5A6C9]">App</span>
          </h1>
          <p className="text-[12px] text-white/40">Acceso del consultorio</p>
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

        <div className="flex items-center justify-center gap-1.5 border-t border-white/10 py-3 text-[10px] text-white/25">
          <Heart size={10} className="text-[#F5A6C9]/50" /> hecho con cariño para tu consultorio
        </div>
      </div>
    </div>
  );
}
