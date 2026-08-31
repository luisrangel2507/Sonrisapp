import { query } from "@/lib/db";

// Protección contra fuerza bruta en /api/auth/login: 5 intentos
// fallidos por usuario bloquean ese usuario 15 minutos. Se guarda en
// la base (no en memoria) para que el bloqueo sobreviva un reinicio
// del servidor. Vive aparte de lib/auth.ts porque ese archivo debe
// poder correr en el runtime Edge (middleware) sin arrastrar "pg".
const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

// Minutos que faltan para que expire el bloqueo, o null si el usuario
// puede intentar entrar (no está bloqueado, o el bloqueo ya expiró).
export async function minutosDeBloqueo(usuario: string): Promise<number | null> {
  const { rows } = await query<{ bloqueado_hasta: string | null }>(
    `SELECT bloqueado_hasta FROM login_intentos WHERE usuario = $1`,
    [usuario]
  );
  const hasta = rows[0]?.bloqueado_hasta ? new Date(rows[0].bloqueado_hasta).getTime() : null;
  if (!hasta || hasta <= Date.now()) return null;
  return Math.ceil((hasta - Date.now()) / 60_000);
}

export async function registrarIntentoFallido(usuario: string) {
  const { rows } = await query<{ intentos: number }>(
    `INSERT INTO login_intentos (usuario, intentos)
     VALUES ($1, 1)
     ON CONFLICT (usuario) DO UPDATE SET intentos = login_intentos.intentos + 1
     RETURNING intentos`,
    [usuario]
  );
  if (rows[0].intentos >= MAX_INTENTOS) {
    await query(
      `UPDATE login_intentos SET intentos = 0, bloqueado_hasta = now() + ($2 || ' minutes')::interval WHERE usuario = $1`,
      [usuario, BLOQUEO_MINUTOS]
    );
  }
}

export async function registrarIntentoExitoso(usuario: string) {
  await query(`DELETE FROM login_intentos WHERE usuario = $1`, [usuario]);
}
