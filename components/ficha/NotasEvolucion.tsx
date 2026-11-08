"use client";

import { useEffect, useState } from "react";
import { NotebookPen, Plus } from "lucide-react";
import type { PacienteNota } from "@/lib/types";
import { CIE10_DENTAL } from "@/lib/cie10-dental";

export const TIPO_NOTA_EVOLUCION = "Nota de evolución";
export const TIPO_NOTA_REFERENCIA = "Nota de referencia";

const VACIA = { ta: "", fc: "", temp: "", evolucion: "", exploracion: "", diagnostico: "", pronostico: "", tratamiento: "", indicaciones: "", dirigida: "", motivo: "" };

// Nota de evolución con la estructura de la NOM-004 (6.2): signos vitales,
// evolución y actualización del cuadro clínico, exploración, diagnóstico,
// pronóstico, tratamiento e indicaciones. Se guarda como nota del paciente
// (cifrada, versionada y con nombre de quien la escribe).
export function NotasEvolucion({ pacienteId }: { pacienteId: number }) {
  const [notas, setNotas] = useState<PacienteNota[]>([]);
  const [abierta, setAbierta] = useState(false);
  const [f, setF] = useState(VACIA);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [modo, setModo] = useState<"evolucion" | "referencia">("evolucion");

  async function cargar() {
    const r = await fetch(`/api/pacientes/${pacienteId}/notas`).catch(() => null);
    const d = r?.ok ? await r.json() : { notas: [] };
    setNotas(((d.notas ?? []) as PacienteNota[]).filter((n) => n.tipo === TIPO_NOTA_EVOLUCION || n.tipo === TIPO_NOTA_REFERENCIA));
  }
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  const set = (k: keyof typeof VACIA, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function guardar() {
    if (modo === "referencia") return guardarReferencia();
    if (!f.evolucion.trim() || !f.tratamiento.trim()) {
      setError("Escribe al menos la evolución y el tratamiento.");
      return;
    }
    setGuardando(true);
    setError("");
    const signos = [f.ta && `TA ${f.ta}`, f.fc && `FC ${f.fc}`, f.temp && `Temp ${f.temp} °C`].filter(Boolean).join(" · ");
    const texto = [
      signos && `Signos vitales: ${signos}`,
      `Evolución: ${f.evolucion.trim()}`,
      f.exploracion.trim() && `Exploración: ${f.exploracion.trim()}`,
      f.diagnostico.trim() && `Diagnóstico: ${f.diagnostico.trim()}`,
      f.pronostico && `Pronóstico: ${f.pronostico}`,
      `Tratamiento: ${f.tratamiento.trim()}`,
      f.indicaciones.trim() && `Indicaciones: ${f.indicaciones.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");
    const r = await fetch(`/api/pacientes/${pacienteId}/notas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: TIPO_NOTA_EVOLUCION, nota: texto, tratamiento: f.tratamiento.trim() }),
    });
    setGuardando(false);
    if (!r.ok) {
      setError("No se pudo guardar la nota.");
      return;
    }
    setF(VACIA);
    setAbierta(false);
    await cargar();
  }

  // NOM-004 (6.3): nota de referencia/traslado o interconsulta — a quién se
  // envía, motivo, resumen clínico, diagnóstico y tratamiento empleado.
  async function guardarReferencia() {
    if (!f.dirigida.trim() || !f.motivo.trim() || !f.evolucion.trim()) {
      setError("Indica a quién se envía, el motivo y el resumen clínico.");
      return;
    }
    setGuardando(true);
    setError("");
    const texto = [
      `Se envía a: ${f.dirigida.trim()}`,
      `Motivo de envío: ${f.motivo.trim()}`,
      `Resumen clínico: ${f.evolucion.trim()}`,
      f.diagnostico.trim() && `Diagnóstico: ${f.diagnostico.trim()}`,
      f.tratamiento.trim() && `Tratamiento empleado: ${f.tratamiento.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");
    const r = await fetch(`/api/pacientes/${pacienteId}/notas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: TIPO_NOTA_REFERENCIA, nota: texto, tratamiento: f.tratamiento.trim() || null }),
    });
    setGuardando(false);
    if (!r.ok) {
      setError("No se pudo guardar la nota.");
      return;
    }
    setF(VACIA);
    setAbierta(false);
    await cargar();
  }

  const campo = "w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]";
  const etiqueta = "block text-[11px] font-medium text-[#a49c8a]";

  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
          <NotebookPen size={13} /> Notas de evolución
        </div>
        <span className="text-[11px] text-[#a49c8a]">{notas.length}</span>
      </div>

      {notas.length === 0 && !abierta && (
        <p className="text-sm text-[#8a8272]">Sin notas de evolución. Escribe una en cada consulta.</p>
      )}
      <div className="space-y-2">
        {notas.map((n) => (
          <div key={n.id} className={`rounded-2xl border border-[#EFE9DC] p-3 ${n.vigente ? "bg-white" : "bg-[#FBF9F5] opacity-70"}`}>
            <div className="flex justify-between gap-2 text-[11px] text-[#a49c8a]">
              <span>
                {new Date(n.subido_en).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
              <span className="text-right">
                {n.tipo === TIPO_NOTA_REFERENCIA && <b className="text-[#7A4D8A]">Referencia · </b>}
                {n.creado_por_nombre}
              </span>
            </div>
            <p className={`mt-1 whitespace-pre-line text-[13px] text-[#2b2118] ${n.vigente ? "" : "line-through"}`}>{n.nota}</p>
          </div>
        ))}
      </div>

      {abierta ? (
        <div className="mt-3 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
          <div className="flex gap-1.5">
            {(["evolucion", "referencia"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold ${modo === m ? "bg-[#7A1E33] text-white" : "border border-[#EFE9DC] text-[#6f6458]"}`}
              >
                {m === "evolucion" ? "Evolución" : "Referencia / interconsulta"}
              </button>
            ))}
          </div>
          {modo === "referencia" && (
            <>
              <div>
                <label className={etiqueta}>Se envía a *</label>
                <input value={f.dirigida} onChange={(e) => set("dirigida", e.target.value)} placeholder="Especialista o establecimiento, ej. Endodoncista Dr. …" className={campo} />
              </div>
              <div>
                <label className={etiqueta}>Motivo de envío *</label>
                <input value={f.motivo} onChange={(e) => set("motivo", e.target.value)} className={campo} />
              </div>
            </>
          )}
          {modo === "evolucion" && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={etiqueta}>TA</label>
              <input value={f.ta} onChange={(e) => set("ta", e.target.value)} placeholder="120/80" className={campo} />
            </div>
            <div>
              <label className={etiqueta}>FC</label>
              <input value={f.fc} onChange={(e) => set("fc", e.target.value)} placeholder="72" className={campo} />
            </div>
            <div>
              <label className={etiqueta}>Temp °C</label>
              <input value={f.temp} onChange={(e) => set("temp", e.target.value)} placeholder="36.5" className={campo} />
            </div>
          </div>
          )}
          <div>
            <label className={etiqueta}>{modo === "evolucion" ? "Evolución y estado actual *" : "Resumen clínico *"}</label>
            <textarea rows={2} value={f.evolucion} onChange={(e) => set("evolucion", e.target.value)} placeholder="Cómo llega el paciente, molestias, cambios desde la última cita" className={campo} />
          </div>
          {modo === "evolucion" && (
          <div>
            <label className={etiqueta}>Exploración</label>
            <textarea rows={2} value={f.exploracion} onChange={(e) => set("exploracion", e.target.value)} className={campo} />
          </div>
          )}
          <div>
            <label className={etiqueta}>Diagnóstico (CIE-10)</label>
            <input list="cie10-evolucion" value={f.diagnostico} onChange={(e) => set("diagnostico", e.target.value)} className={campo} />
            <datalist id="cie10-evolucion">
              {CIE10_DENTAL.map(([c, d]) => (
                <option key={c} value={`${c} — ${d}`} />
              ))}
            </datalist>
          </div>
          {modo === "evolucion" && (
          <div>
            <label className={etiqueta}>Pronóstico</label>
            <select value={f.pronostico} onChange={(e) => set("pronostico", e.target.value)} className={campo}>
              <option value="">—</option>
              <option>Bueno</option>
              <option>Reservado</option>
              <option>Malo</option>
            </select>
          </div>
          )}
          <div>
            <label className={etiqueta}>{modo === "evolucion" ? "Tratamiento realizado *" : "Tratamiento empleado"}</label>
            <textarea rows={2} value={f.tratamiento} onChange={(e) => set("tratamiento", e.target.value)} className={campo} />
          </div>
          {modo === "evolucion" && (
          <div>
            <label className={etiqueta}>Indicaciones al paciente</label>
            <textarea rows={2} value={f.indicaciones} onChange={(e) => set("indicaciones", e.target.value)} className={campo} />
          </div>
          )}
          {error && <p className="text-[12px] text-[#B0503A]">{error}</p>}
          <p className="text-[11px] text-[#a49c8a]">Se firma con tu nombre de usuario y queda con fecha y hora.</p>
          <div className="flex gap-2">
            <button onClick={guardar} disabled={guardando} className="flex-1 rounded-full btn-vino py-2 text-[13px] font-semibold text-white disabled:opacity-50">
              {guardando ? "Guardando…" : "Guardar nota"}
            </button>
            <button onClick={() => setAbierta(false)} className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAbierta(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#F5E7E9] py-2.5 text-[13px] font-semibold text-[#803449]"
        >
          <Plus size={14} /> Nueva nota (evolución o referencia)
        </button>
      )}
    </div>
  );
}
