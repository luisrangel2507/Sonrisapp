import { query } from "@/lib/db";

interface PasskeyRow {
  id: number;
  nombre_dispositivo: string;
  credential_id: string;
  public_key: string;
  contador: number;
}

export async function obtenerPasskeyPorCredentialId(credentialId: string) {
  const { rows } = await query<PasskeyRow>(
    `SELECT id, nombre_dispositivo, credential_id, public_key, contador FROM passkeys WHERE credential_id = $1`,
    [credentialId]
  );
  return rows[0] ?? null;
}

export async function guardarPasskey(nombreDispositivo: string, credentialId: string, publicKey: string) {
  await query(`INSERT INTO passkeys (nombre_dispositivo, credential_id, public_key) VALUES ($1, $2, $3)`, [
    nombreDispositivo,
    credentialId,
    publicKey,
  ]);
}

export async function actualizarContadorPasskey(id: number, contador: number) {
  await query(`UPDATE passkeys SET contador = $2 WHERE id = $1`, [id, contador]);
}

export async function listarPasskeys() {
  const { rows } = await query<{ id: number; nombre_dispositivo: string; creado_en: string }>(
    `SELECT id, nombre_dispositivo, creado_en FROM passkeys ORDER BY creado_en DESC`
  );
  return rows;
}

export async function borrarPasskey(id: number) {
  await query(`DELETE FROM passkeys WHERE id = $1`, [id]);
}
