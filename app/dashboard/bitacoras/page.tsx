"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Plus } from "lucide-react";
import { Esqueleto } from "@/components/Esqueleto";
import { hoyISO } from "@/lib/fechas";

type Tipo = "esterilizacion" | "rpbi" | "rayosx";

const PESTANAS: [Tipo, string][] = [
  ["esterilizacion", "Esterilización"],
  ["rpbi", "RPBI"],
  ["rayosx", "Rayos X"],
];
type Registro = Record<string, string | number | null> & { id: number; fecha: string };

const RESIDUOS: Record<string, string> = {
  punzocortantes: "Punzocortantes (agujas, hojas de bisturí)",
  no_anatomicos: "No anatómicos (gasas, algodones con sangre)",
  patologicos: "Patológicos (dientes, tejidos)",
  sangre: "Sangre y derivados",
};

const campo = "w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]";
const etiqueta = "block text-[11px] font-medium text-[#a49c8a]";
const fechaCorta = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

// Bitácoras sanitarias: esterilización (NOM-013) y RPBI (NOM-087). Lo que
// piden en una visita de verificación sanitaria, en un solo lugar.
export default function BitacorasPage() {
  const [tipo, setTipo] = useState<Tipo>("esterilizacion");
  const [registros, setRegistros] = useState<Registro[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function cargar(t: Tipo) {
    setRegistros(null);
    const r = await fetch(`/api/bitacoras/${t}`).catch(() => null);
    const d = r?.ok ? await r.json() : { registros: [] };
    setRegistros(d.registros ?? []);
  }
  useEffect(() => {
    cargar(tipo);
  }, [tipo]);

  function nuevo() {
    setF(
      tipo === "esterilizacion"
        ? { fecha: hoyISO(), testigo_quimico: "paso", testigo_biologico: "no_aplica", temperatura: "134 °C", tiempo_min: "4" }
        : tipo === "rpbi"
          ? { fecha: hoyISO(), tipo: "punzocortantes" }
          : { fecha: hoyISO(), tipo_estudio: "Periapical", exposiciones: "1", proteccion: "Mandil y collarín plomados", embarazo_descartado: "si" }
    );
    setError("");
    setAbierto(true);
  }
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function guardar() {
    setGuardando(true);
    setError("");
    const r = await fetch(`/api/bitacoras/${tipo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setGuardando(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "No se pudo guardar.");
      return;
    }
    setAbierto(false);
    await cargar(tipo);
  }

  return (
    <div className="mx-4 mt-2 space-y-3 pb-6 md:mx-auto md:max-w-2xl">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-[#2b2118]">
        <ShieldCheck size={22} className="text-[#803449]" /> Bitácoras sanitarias
      </h1>
      <p className="text-[13px] text-[#8a8272]">
        Registros de esterilización (NOM-013), residuos biológico-infecciosos (NOM-087) y
        rayos X (NOM-229). Es lo que piden en una visita de verificación sanitaria.
      </p>

      <div className="flex gap-1.5">
        {PESTANAS.map(([t, nombre]) => (
          <button
            key={t}
            onClick={() => {
              setTipo(t);
              setAbierto(false);
            }}
            className={`flex-1 rounded-full px-2 py-2 text-[12px] font-semibold ${
              tipo === t ? "bg-[#7A1E33] text-white" : "border border-[#EFE9DC] bg-white text-[#6f6458]"
            }`}
          >
            {nombre}
          </button>
        ))}
      </div>

      {abierto ? (
        <div className="space-y-2 rounded-3xl border border-[#EFE9DC] bg-white/70 p-4">
          <div>
            <label className={etiqueta}>Fecha</label>
            <input type="date" value={f.fecha ?? ""} max={hoyISO()} onChange={(e) => set("fecha", e.target.value)} className={campo} />
          </div>
          {tipo === "esterilizacion" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={etiqueta}>Equipo (autoclave)</label>
                  <input value={f.equipo ?? ""} onChange={(e) => set("equipo", e.target.value)} placeholder="Autoclave 1" className={campo} />
                </div>
                <div>
                  <label className={etiqueta}>No. de ciclo / carga</label>
                  <input value={f.ciclo ?? ""} onChange={(e) => set("ciclo", e.target.value)} className={campo} />
                </div>
                <div>
                  <label className={etiqueta}>Temperatura</label>
                  <input value={f.temperatura ?? ""} onChange={(e) => set("temperatura", e.target.value)} className={campo} />
                </div>
                <div>
                  <label className={etiqueta}>Tiempo (min)</label>
                  <input value={f.tiempo_min ?? ""} onChange={(e) => set("tiempo_min", e.target.value)} className={campo} />
                </div>
                <div>
                  <label className={etiqueta}>Testigo químico</label>
                  <select value={f.testigo_quimico ?? ""} onChange={(e) => set("testigo_quimico", e.target.value)} className={campo}>
                    <option value="paso">Viró correctamente</option>
                    <option value="fallo">No viró (repetir)</option>
                  </select>
                </div>
                <div>
                  <label className={etiqueta}>Testigo biológico</label>
                  <select value={f.testigo_biologico ?? ""} onChange={(e) => set("testigo_biologico", e.target.value)} className={campo}>
                    <option value="no_aplica">No se usó en esta carga</option>
                    <option value="negativo">Negativo (correcto)</option>
                    <option value="positivo">Positivo (falla)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={etiqueta}>Contenido de la carga</label>
                <input value={f.contenido ?? ""} onChange={(e) => set("contenido", e.target.value)} placeholder="Ej. 6 paquetes de instrumental básico, fresas" className={campo} />
              </div>
            </>
          ) : tipo === "rayosx" ? (
            <>
              <div>
                <label className={etiqueta}>Paciente</label>
                <input value={f.paciente ?? ""} onChange={(e) => set("paciente", e.target.value)} placeholder="Nombre del paciente" className={campo} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={etiqueta}>Tipo de estudio</label>
                  <select value={f.tipo_estudio ?? ""} onChange={(e) => set("tipo_estudio", e.target.value)} className={campo}>
                    {["Periapical", "Aleta de mordida", "Oclusal", "Panorámica", "Lateral de cráneo"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={etiqueta}>No. de exposiciones</label>
                  <input type="number" min="1" value={f.exposiciones ?? ""} onChange={(e) => set("exposiciones", e.target.value)} className={campo} />
                </div>
              </div>
              <div>
                <label className={etiqueta}>Protección usada</label>
                <input value={f.proteccion ?? ""} onChange={(e) => set("proteccion", e.target.value)} className={campo} />
              </div>
              <div>
                <label className={etiqueta}>¿Se descartó embarazo?</label>
                <select value={f.embarazo_descartado ?? ""} onChange={(e) => set("embarazo_descartado", e.target.value)} className={campo}>
                  <option value="si">Sí</option>
                  <option value="no_aplica">No aplica</option>
                  <option value="no">No</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={etiqueta}>Tipo de residuo</label>
                <select value={f.tipo ?? ""} onChange={(e) => set("tipo", e.target.value)} className={campo}>
                  {Object.entries(RESIDUOS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={etiqueta}>Cantidad (kg)</label>
                  <input type="number" min="0" step="0.01" value={f.cantidad_kg ?? ""} onChange={(e) => set("cantidad_kg", e.target.value)} className={campo} />
                </div>
                <div>
                  <label className={etiqueta}>No. de manifiesto</label>
                  <input value={f.manifiesto ?? ""} onChange={(e) => set("manifiesto", e.target.value)} className={campo} />
                </div>
              </div>
              <div>
                <label className={etiqueta}>Empresa recolectora</label>
                <input value={f.recolector ?? ""} onChange={(e) => set("recolector", e.target.value)} placeholder="Nombre de la empresa autorizada" className={campo} />
              </div>
            </>
          )}
          <div>
            <label className={etiqueta}>Nota</label>
            <input value={f.nota ?? ""} onChange={(e) => set("nota", e.target.value)} className={campo} />
          </div>
          {error && <p className="text-[12px] text-[#B0503A]">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={guardar} disabled={guardando} className="flex-1 rounded-full btn-vino py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">
              {guardando ? "Guardando…" : "Guardar registro"}
            </button>
            <button onClick={() => setAbierto(false)} className="rounded-full border border-[#EFE9DC] px-4 py-2.5 text-[13px] text-[#8a8272]">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={nuevo} className="flex w-full items-center justify-center gap-2 rounded-full btn-vino py-3 text-[14px] font-semibold text-white">
          <Plus size={15} />{" "}
          {tipo === "esterilizacion" ? "Registrar ciclo de esterilización" : tipo === "rpbi" ? "Registrar entrega de RPBI" : "Registrar estudio de rayos X"}
        </button>
      )}

      {registros === null ? (
        <Esqueleto />
      ) : registros.length === 0 ? (
        <p className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-sm text-[#8a8272]">Sin registros todavía.</p>
      ) : (
        <div className="space-y-2">
          {registros.map((r) => (
            <div key={r.id} className="rounded-2xl border border-[#EFE9DC] bg-white/70 p-3 text-[13px]">
              <div className="flex justify-between gap-2">
                <b className="text-[#2b2118]">{fechaCorta(r.fecha)}</b>
                {tipo === "esterilizacion" ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      r.testigo_quimico === "fallo" || r.testigo_biologico === "positivo"
                        ? "bg-[#FBEAE8] text-[#8f3b28]"
                        : "bg-[#EEF4EA] text-[#2f5226]"
                    }`}
                  >
                    {r.testigo_quimico === "fallo" || r.testigo_biologico === "positivo" ? "Falla — repetir" : "Correcto"}
                  </span>
                ) : tipo === "rayosx" ? (
                  <span className="shrink-0 text-[12px] font-semibold text-[#2b2118]">{r.tipo_estudio}</span>
                ) : (
                  <span className="shrink-0 font-semibold text-[#2b2118]">{r.cantidad_kg != null ? `${r.cantidad_kg} kg` : ""}</span>
                )}
              </div>
              <div className="mt-0.5 text-[12px] text-[#8a8272]">
                {tipo === "esterilizacion"
                  ? [r.equipo, r.ciclo && `ciclo ${r.ciclo}`, r.temperatura, r.tiempo_min && `${r.tiempo_min} min`, r.contenido]
                      .filter(Boolean)
                      .join(" · ")
                  : tipo === "rayosx"
                    ? [r.paciente, r.exposiciones && `${r.exposiciones} exposición(es)`, r.proteccion, r.embarazo_descartado === "si" && "embarazo descartado"]
                        .filter(Boolean)
                        .join(" · ")
                    : [RESIDUOS[String(r.tipo)] ?? r.tipo, r.recolector, r.manifiesto && `manifiesto ${r.manifiesto}`].filter(Boolean).join(" · ")}
              </div>
              <div className="mt-0.5 text-[11px] text-[#a49c8a]">
                {r.responsable}
                {r.nota ? ` · ${r.nota}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
