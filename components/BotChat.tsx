"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

interface Mensaje {
  role: "user" | "assistant";
  text: string;
}

export function BotChat() {
  const [messages, setMessages] = useState<Mensaje[]>([
    { role: "assistant", text: "Hola, soy el asistente de la clínica 🦷 ¿Te ayudo con horarios, precios o quieres agendar?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function enviar() {
    if (!input.trim() || loading) return;
    const nuevo: Mensaje = { role: "user", text: input };
    const historial = [...messages, nuevo];
    setMessages(historial);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historial }),
      });
      const data = await response.json();
      const texto = response.ok ? data.texto : "El bot no está configurado todavía en este entorno.";
      setMessages((prev) => [...prev, { role: "assistant", text: texto }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Hubo un problema de conexión, intenta de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-[#EFE9DC] bg-white">
      <div className="flex items-center gap-2 border-b border-[#EFE9DC] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7E5E0] text-[#B0503A]">
          <MessageCircle size={14} />
        </div>
        <span className="text-sm font-medium text-[#2b2118]">Simulador del bot</span>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-[#FBF9F4] px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[#2b2118] text-white rounded-br-sm"
                  : "bg-white border border-[#EFE9DC] text-[#2b2118] rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-[#EFE9DC] bg-white px-4 py-2.5">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c9c2b0] [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c9c2b0] [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c9c2b0]" />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-[#EFE9DC] p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder="Escribe como paciente…"
          className="flex-1 rounded-full border border-[#EFE9DC] bg-[#FBF9F4] px-4 py-2 text-sm outline-none focus:border-[#C96F3B]"
        />
        <button
          onClick={enviar}
          disabled={loading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2b2118] text-white disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
