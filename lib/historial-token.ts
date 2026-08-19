import { query } from "@/lib/db";

export function generarHistorialToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

// Genera y guarda un token si el paciente no tiene uno todavía —
// así también funciona para pacientes dados de alta antes de que
// existiera esta función.
export async function asegurarHistorialToken(pacienteId: number): Promise<string> {
  const { rows } = await query<{ historial_token: string | null }>(
    `SELECT historial_token FROM pacientes WHERE id = $1`,
    [pacienteId]
  );
  if (rows.length === 0) {
    throw new Error("paciente no encontrado");
  }
  if (rows[0].historial_token) {
    return rows[0].historial_token;
  }

  const token = generarHistorialToken();
  await query(`UPDATE pacientes SET historial_token = $2 WHERE id = $1`, [pacienteId, token]);
  return token;
}
