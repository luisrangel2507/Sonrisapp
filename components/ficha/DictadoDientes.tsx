"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mic, MicOff, Sparkles } from "lucide-react";
import { interpretarDictado, type FilaDictado } from "@/lib/dictado";
import { ESTADO_DIENTE } from "@/lib/dental";

// Tipos mínimos de la Web Speech API (no vienen en lib.dom).
interface Reconocimiento {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void;
}

const etiquetaEstado = (e: string) => (ESTADO_DIENTE as Record<string, { label: string }>)[e]?.label ?? e;

export function DictadoDientes({ pacienteId, alAplicar }: { pacienteId: number; alAplicar: () => void }) {
  const [texto, setTexto] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [soportado, setSoportado] = useState(true);
  const [filas, setFilas] = useState<(FilaDictado & { ok: boolean })[] | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const rec = useRef<Reconocimiento | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Reconocimiento; webkitSpeechRecognition?: new () => Reconocimiento };
    if (!(w.SpeechRecognition || w.webkitSpeechRecognition)) setSoportado(false);
    return () => rec.current?.stop();
  }, []);

  function alternarMic() {
    if (escuchando) { rec.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => Reconocimiento; webkitSpeechRecognition?: new () => Reconocimiento };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "es-MX"; r.continuous = true; r.interimResults = false;
    r.onresult = (e) => {
      let nuevo = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) nuevo += e.results[i][0].transcript + ". ";
      if (nuevo) setTexto((t) => (t ? t + " " : "") + nuevo);
    };
    r.onend = () => setEscuchando(false);
    r.onerror = () => setEscuchando(false);
    rec.current = r; r.start(); setEscuchando(true);
  }

  function interpretar() {
    setFilas(interpretarDictado(texto).map((f) => ({ ...f, ok: f.estado !== null })));
  }

  async function aplicar() {
    if (!filas || aplicando) return;
    setAplicando(true);
    for (const f of filas.filter((x) => x.ok && x.estado)) {
      await fetch(`/api/pacientes/${pacienteId}/dientes/${f.diente}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: f.tipo, estado: f.estado, nota: `Dictado: «${f.fragmento}»` }),
      });
    }
    setAplicando(false); setFilas(null); setTexto("");
    alAplicar();
  }

  const aceptadas = filas?.filter((f) => f.ok).length ?? 0;
  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8a8272]">
        <Sparkles size={13} /> Dictar padecimientos
      </div>
      <p className="mb-3 text-xs text-[#8a8272]">
        Ej.: «caries en el 16 y 26, el 36 necesita endodoncia, el 48 extracción». Revisas la lista antes de aplicar.
      </p>
      <textarea
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setFilas(null); }}
        rows={3}
        placeholder={soportado ? "Toca el micrófono y habla, o escribe aquí…" : "Escribe aquí lo que encontraste…"}
        className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
      />
      <div className="mt-2 flex gap-2">
        {soportado && (
          <button onClick={alternarMic} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold ${escuchando ? "bg-[#C81E3A] text-white" : "border border-[#EFE9DC] bg-white text-[#7A1E33]"}`}>
            {escuchando ? <MicOff size={15} /> : <Mic size={15} />} {escuchando ? "Detener" : "Dictar"}
          </button>
        )}
        <button onClick={interpretar} disabled={!texto.trim()} className="flex-1 rounded-full btn-vino py-2 text-[13px] font-semibold text-white disabled:opacity-50">
          Interpretar
        </button>
      </div>

      {filas && (
        <div className="mt-4 space-y-2">
          {filas.length === 0 && <p className="text-sm text-[#8f3b28]">No encontré números de diente (11–48). Di por ejemplo «caries en el 16».</p>}
          {filas.map((f, i) => (
            <label key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] ${f.estado ? "bg-[#EEF4EA] text-[#2f5226]" : "bg-[#FCF3DC] text-[#7a5410]"}`}>
              <input type="checkbox" checked={f.ok} disabled={!f.estado}
                onChange={() => setFilas(filas.map((x, j) => (j === i ? { ...x, ok: !x.ok } : x)))} />
              <span className="font-bold">Diente {f.diente}</span>
              <span className="flex-1">{f.estado ? etiquetaEstado(f.estado) : "No estoy seguro — agrégalo a mano en el odontograma"}</span>
              {f.estado && f.ok && <Check size={15} />}
            </label>
          ))}
          {aceptadas > 0 && (
            <div className="flex gap-2 pt-1">
              <button onClick={() => setFilas(null)} className="rounded-full border border-[#EFE9DC] bg-white px-4 py-2 text-[13px] font-semibold text-[#6f6458]">Descartar</button>
              <button onClick={aplicar} disabled={aplicando} className="flex-1 rounded-full btn-vino py-2 text-[13px] font-semibold text-white disabled:opacity-50">
                {aplicando ? "Aplicando…" : `Aplicar ${aceptadas} al odontograma`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
