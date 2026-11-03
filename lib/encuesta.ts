import { randomBytes } from "node:crypto";
import { query } from "@/lib/db";

// Crea (o reutiliza) la encuesta de satisfacción de una cita y regresa su token.
export async function asegurarEncuesta(citaId: number, pacienteId: number): Promise<string> {
  const token = randomBytes(18).toString("base64url");
  const { rows } = await query<{ token: string }>(
    `INSERT INTO encuestas (token, cita_id, paciente_id) VALUES ($1, $2, $3)
     ON CONFLICT (cita_id) DO UPDATE SET cita_id = EXCLUDED.cita_id
     RETURNING token`,
    [token, citaId, pacienteId]
  );
  return rows[0].token;
}
