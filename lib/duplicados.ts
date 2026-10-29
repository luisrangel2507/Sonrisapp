import { query } from "@/lib/db";

// Detección de pacientes que probablemente ya están registrados. Compara
// sin importar acentos, mayúsculas ni espacios extra, y por teléfono
// (últimos 10 dígitos).
export interface Parecido {
  id: number;
  nombre: string;
  folio: string | null;
  telefono: string | null;
  activo: boolean;
  motivo: "mismo_telefono" | "mismo_nombre" | "nombre_parecido";
}

export function normalizarNombre(txt: string) {
  return txt
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function claveTelefono(tel: string | null | undefined) {
  const d = String(tel ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
}

// Nombre parecido: todas las palabras del nombre más corto (al menos 2)
// aparecen en el otro. Así "María López" encuentra a "Maria Fernanda López".
export function nombreParecido(a: string, b: string) {
  const ta = a.split(" ").filter(Boolean);
  const tb = b.split(" ").filter(Boolean);
  const [corto, largo] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (corto.length < 2) return false;
  return corto.every((t) => largo.includes(t));
}

export async function buscarParecidos(nombre: string, telefono?: string | null): Promise<Parecido[]> {
  const n = normalizarNombre(nombre);
  const t = claveTelefono(telefono);
  if (!n && !t) return [];

  const { rows } = await query<{ id: number; nombre: string; folio: string | null; telefono: string | null; activo: boolean }>(
    `SELECT id, nombre, folio, telefono, COALESCE(activo, true) AS activo FROM pacientes`
  );

  const orden = { mismo_telefono: 0, mismo_nombre: 1, nombre_parecido: 2 } as const;
  const encontrados: Parecido[] = [];
  for (const p of rows) {
    const pn = normalizarNombre(p.nombre);
    let motivo: Parecido["motivo"] | null = null;
    if (t && claveTelefono(p.telefono) === t) motivo = "mismo_telefono";
    else if (n && pn === n) motivo = "mismo_nombre";
    else if (n && nombreParecido(n, pn)) motivo = "nombre_parecido";
    if (motivo) encontrados.push({ ...p, motivo });
  }
  return encontrados.sort((a, b) => orden[a.motivo] - orden[b.motivo]).slice(0, 5);
}

// ¿Es la misma persona? Mismo teléfono Y nombre igual o parecido. Solo el
// teléfono no basta: en una familia suelen compartirlo.
export function esMismaPersona(nombre: string, p: Parecido) {
  if (p.motivo !== "mismo_telefono") return p.motivo === "mismo_nombre";
  const a = normalizarNombre(nombre);
  const b = normalizarNombre(p.nombre);
  return a === b || nombreParecido(a, b);
}
