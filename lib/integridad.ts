import { createHash } from "node:crypto";

// Huella de integridad (SHA-256) de un documento clínico. Se calcula
// sobre el contenido en claro con las llaves en orden fijo, para que el
// mismo documento siempre dé la misma huella.
export function huella(datos: Record<string, unknown>): string {
  const ordenado = Object.keys(datos)
    .sort()
    .map((k) => [k, datos[k] instanceof Date ? (datos[k] as Date).toISOString() : (datos[k] ?? null)]);
  return createHash("sha256").update(JSON.stringify(ordenado)).digest("hex");
}

// true = coincide, false = el documento cambió, null = documento anterior a la huella.
export function verificarHuella(guardada: string | null | undefined, datos: Record<string, unknown>): boolean | null {
  if (!guardada) return null;
  return guardada === huella(datos);
}

export const camposHuellaReceta = (r: Record<string, unknown>) => ({
  id: r.id,
  paciente_id: r.paciente_id,
  fecha: r.fecha instanceof Date ? r.fecha.toISOString().slice(0, 10) : String(r.fecha ?? "").slice(0, 10),
  diagnostico: r.diagnostico ?? null,
  medicamentos: r.medicamentos ?? null,
  indicaciones: r.indicaciones ?? null,
  peso: r.peso ?? null,
  creado_por_nombre: r.creado_por_nombre ?? null,
});

export const camposHuellaConsentimiento = (c: Record<string, unknown>) => {
  const base: Record<string, unknown> = {
    id: c.id,
    titulo: c.titulo ?? null,
    contenido: c.contenido ?? null,
    firma: c.firma ?? null,
    nombre_firma: c.nombre_firma ?? null,
    firmado_en: c.firmado_en instanceof Date ? c.firmado_en.toISOString() : (c.firmado_en ?? null),
  };
  // Campos agregados después: solo entran si tienen valor, para que las
  // huellas de consentimientos firmados antes sigan coincidiendo.
  for (const k of ["informante_nombre", "informante_firma", "testigo1_nombre", "testigo1_firma", "testigo2_nombre", "testigo2_firma"]) {
    if (c[k]) base[k] = c[k];
  }
  return base;
};
