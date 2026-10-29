import { query } from "@/lib/db";

// Genera el siguiente folio consecutivo con formato 'SNR-0001': toma el
// número más alto entre los folios SNR-#### existentes (ignora cualquier
// otro formato) y le suma uno.
export async function generarFolio() {
  const { rows } = await query<{ ultimo: number | null }>(
    `SELECT MAX(substring(folio from '^SNR-(\\d+)$')::int) AS ultimo FROM pacientes WHERE folio ~ '^SNR-\\d+$'`
  );
  const siguiente = (rows[0]?.ultimo ?? 0) + 1;
  return `SNR-${String(siguiente).padStart(4, "0")}`;
}
