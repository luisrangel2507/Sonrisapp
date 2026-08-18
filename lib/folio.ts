import { query } from "@/lib/db";

// Genera el siguiente folio consecutivo con formato 'SNR-0001'.
export async function generarFolio() {
  const { rows } = await query<{ folio: string }>(
    `SELECT folio FROM pacientes WHERE folio IS NOT NULL ORDER BY id DESC LIMIT 1`
  );
  const ultimo = rows[0]?.folio;
  const ultimoNumero = ultimo ? parseInt(ultimo.replace("SNR-", ""), 10) : 0;
  const siguiente = (ultimoNumero || 0) + 1;
  return `SNR-${String(siguiente).padStart(4, "0")}`;
}
