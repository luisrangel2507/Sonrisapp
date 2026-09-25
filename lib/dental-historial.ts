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
// o se hizo en esos dientes). Los dientes sanos y sin tratamientos
// registrados no aportan nada que reportar, así que se omiten de la
// lista (aunque estén marcados en el odontograma del presupuesto).
export async function obtenerHistorialDientes(
  pacienteId: number,
  numerosFdi: number[]
): Promise<HistorialDienteResumen[]> {
  if (numerosFdi.length === 0) return [];

  const { rows: dientes } = await query<{ id: number; numero_fdi: number; estado: string }>(
    `SELECT id, numero_fdi, estado FROM paciente_dientes WHERE paciente_id = $1 AND numero_fdi = ANY($2)`,
    [pacienteId, numerosFdi]
  );

  const ids = dientes.map((d) => d.id);
  const { rows: historial } =
    ids.length > 0
      ? await query<{
          paciente_diente_id: number;
          tipo: string;
          fecha: string;
          nota: string | null;
        }>(
          `SELECT paciente_diente_id, tipo, fecha, nota
           FROM diente_historial WHERE paciente_diente_id = ANY($1) AND vigente = true
           ORDER BY fecha ASC`,
          [ids]
        )
      : { rows: [] };

  const porNumero = new Map(dientes.map((d) => [d.numero_fdi, d]));

  return [...numerosFdi]
    .sort((a, b) => a - b)
    .map((numero_fdi) => {
      const d = porNumero.get(numero_fdi);
      return {
        numero_fdi,
        estado: d?.estado ?? "sano",
        entradas: d
          ? historial
              .filter((h) => h.paciente_diente_id === d.id)
              .map((h) => ({ tipo: h.tipo, fecha: h.fecha, nota: descifrar(h.nota) }))
          : [],
      };
    })
    .filter((d) => d.estado !== "sano" || d.entradas.length > 0);
}
