import { query } from "@/lib/db";

export function generarHistorialToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

// Regresa el token del paciente (lo genera si no tiene uno — así también
// funciona para pacientes dados de alta antes de que existiera).
export async function asegurarHistorialToken(pacienteId: number): Promise<string> {
  const { rows } = await query<{ historial_token: string | null }>(
    `SELECT historial_token FROM pacientes WHERE id = $1`,
    [pacienteId]
  );
  if (rows.length === 0) {
    throw new Error("paciente no encontrado");
  }
  // Compartir el link lo renueva: vuelve a valer 90 días desde hoy.
  const token = rows[0].historial_token ?? generarHistorialToken();
  await query(
    `UPDATE pacientes SET historial_token = $2, historial_token_expira_en = now() + interval '90 days' WHERE id = $1`,
    [pacienteId, token]
  );
  return token;
}
