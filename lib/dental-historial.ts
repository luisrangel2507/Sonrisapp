import { query } from "@/lib/db";
import { descifrar } from "@/lib/crypto";

export interface HistorialDienteResumen {
  numero_fdi: number;
  estado: string;
  entradas: { tipo: string; fecha: string; nota: string | null }[];
}

// Historial de atención (estado actual + tratamientos registrados) de
// una lista puntual de dientes — para mostrar, junto a un presupuesto,
// por qué se está proponiendo cada tratamiento (lo que ya se detectó
// o se hizo en esos dientes). No incluye dientes sin ninguna ficha
// todavía (paciente_dientes solo tiene fila una vez que algo se marcó).
export async function obtenerHistorialDientes(
  pacienteId: number,
  numerosFdi: number[]
): Promise<HistorialDienteResumen[]> {
  if (numerosFdi.length === 0) return [];

  const { rows: dientes } = await query<{ id: number; numero_fdi: number; estado: string }>(
    `SELECT id, numero_fdi, estado FROM paciente_dientes WHERE paciente_id = $1 AND numero_fdi = ANY($2)`,
    [pacienteId, numerosFdi]
  );
  if (dientes.length === 0) return [];

  const ids = dientes.map((d) => d.id);
  const { rows: historial } = await query<{
    paciente_diente_id: number;
    tipo: string;
    fecha: string;
    nota: string | null;
  }>(
    `SELECT paciente_diente_id, tipo, fecha, nota
     FROM diente_historial WHERE paciente_diente_id = ANY($1) AND vigente = true
     ORDER BY fecha ASC`,
    [ids]
  );

  return [...dientes]
    .sort((a, b) => a.numero_fdi - b.numero_fdi)
    .map((d) => ({
      numero_fdi: d.numero_fdi,
      estado: d.estado,
      entradas: historial
        .filter((h) => h.paciente_diente_id === d.id)
        .map((h) => ({ tipo: h.tipo, fecha: h.fecha, nota: descifrar(h.nota) })),
    }));
}
