import { query } from "@/lib/db";
import type { IdentidadSesion } from "@/lib/auth";

// Una sesión firmada es válida por 30 días, pero puede revocarse antes:
// "Cerrar todas las sesiones" (fecha global) o al borrar un usuario o
// cerrarle las sesiones (fecha por usuario). Se consulta en el proxy en
// cada petición, con un caché corto para no pegarle a la base siempre.
const CACHE_MS = 10_000;
let global: { desde: number; leido: number } | null = null;
const porUsuario = new Map<number, { desde: number | null; leido: number }>();

async function desdeGlobal() {
  if (global && Date.now() - global.leido < CACHE_MS) return global.desde;
  const { rows } = await query<{ desde: string }>(`SELECT sesiones_validas_desde AS desde FROM seguridad WHERE id = 1`);
  global = { desde: rows[0] ? new Date(rows[0].desde).getTime() : 0, leido: Date.now() };
  return global.desde;
}

// null = el usuario ya no existe.
async function desdeUsuario(id: number) {
  const c = porUsuario.get(id);
  if (c && Date.now() - c.leido < CACHE_MS) return c.desde;
  const { rows } = await query<{ desde: string }>(`SELECT sesiones_validas_desde AS desde FROM usuarios WHERE id = $1`, [id]);
  const desde = rows[0] ? new Date(rows[0].desde).getTime() : null;
  porUsuario.set(id, { desde, leido: Date.now() });
  return desde;
}

export function olvidarCacheSesiones() {
  global = null;
  porUsuario.clear();
}

export async function sesionVigente(identidad: IdentidadSesion, iat: number | undefined) {
  const emitida = iat ?? 0;
  try {
    if (emitida < (await desdeGlobal())) return false;
    if (identidad.usuarioId != null) {
      const desde = await desdeUsuario(identidad.usuarioId);
      if (desde === null || emitida < desde) return false;
    }
    return true;
  } catch {
    // Si la base no responde no se tumba el panel: la firma ya se validó.
    return true;
  }
}
