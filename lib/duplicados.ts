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
  motivo: "misma_curp" | "mismo_telefono" | "mismo_correo" | "mismo_nombre" | "nombre_parecido" | "misma_fecha";
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

// Distancia de edición (letras que cambian) para atrapar errores de dedo:
// "Ma. Fernanda Lopes" vs "Maria Fernanda Lopez".
function distancia(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

const palabras = (s: string) => s.split(" ").filter((t) => t.length >= 3 && !["del", "las", "los"].includes(t));

// Nombre parecido si:
// - todas las palabras del nombre más corto (al menos 2) están en el otro
//   ("María López" encuentra a "Maria Fernanda López"), o
// - comparten 2 palabras o más (mismos apellidos, o nombre + apellido), o
// - el nombre completo difiere en 1-2 letras (error de dedo).
// Versión estricta (para decidir solos que es la misma persona): solo el
// nombre contenido en el otro o un error de dedo, no "mismos apellidos".
export function nombreMuyParecido(a: string, b: string) {
  const ta = a.split(" ").filter(Boolean);
  const tb = b.split(" ").filter(Boolean);
  const [corto, largo] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (corto.length >= 2 && corto.every((t) => largo.includes(t))) return true;
  return Math.min(a.length, b.length) >= 8 && distancia(a, b) <= 2;
}

export function nombreParecido(a: string, b: string) {
  if (nombreMuyParecido(a, b)) return true;
  const pa = palabras(a);
  const pb = new Set(palabras(b));
  return pa.filter((t) => pb.has(t)).length >= 2;
}

export async function buscarParecidos(
  nombre: string,
  telefono?: string | null,
  extra: { email?: string | null; fechaNacimiento?: string | null; curp?: string | null; excluirId?: number } = {}
): Promise<Parecido[]> {
  const n = normalizarNombre(nombre);
  const t = claveTelefono(telefono);
  const correo = extra.email?.trim().toLowerCase() || null;
  const fecha = extra.fechaNacimiento?.slice(0, 10) || null;
  const curp = extra.curp?.trim().toUpperCase() || null;
  if (!n && !t && !correo && !curp) return [];

  const { rows } = await query<{
    id: number;
    nombre: string;
    folio: string | null;
    telefono: string | null;
    email: string | null;
    curp: string | null;
    fecha: string | null;
    activo: boolean;
  }>(
    `SELECT id, nombre, folio, telefono, email, curp, to_char(fecha_nacimiento, 'YYYY-MM-DD') AS fecha,
            COALESCE(activo, true) AS activo
     FROM pacientes WHERE id <> $1`,
    [extra.excluirId ?? 0]
  );

  const orden = { misma_curp: -1, mismo_telefono: 0, mismo_correo: 1, mismo_nombre: 2, misma_fecha: 3, nombre_parecido: 4 } as const;
  const encontrados: Parecido[] = [];
  for (const { email, curp: curpP, fecha: fechaP, ...p } of rows) {
    const pn = normalizarNombre(p.nombre);
    let motivo: Parecido["motivo"] | null = null;
    if (curp && curpP?.toUpperCase() === curp) motivo = "misma_curp";
    else if (t && claveTelefono(p.telefono) === t) motivo = "mismo_telefono";
    else if (correo && email?.trim().toLowerCase() === correo) motivo = "mismo_correo";
    else if (n && pn === n) motivo = "mismo_nombre";
    else if (n && fecha && fechaP === fecha && palabras(n).some((w) => palabras(pn).includes(w))) motivo = "misma_fecha";
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
  return a === b || nombreMuyParecido(a, b);
}
