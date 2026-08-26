import { query } from "@/lib/db";
import { HISTORIA_CLINICA_CAMPOS as CAMPOS, HISTORIA_CLINICA_COLUMNAS as COLUMNAS } from "@/lib/historia-clinica-campos";

// Trazabilidad tipo NOM-024: nunca se sobrescribe la historia clínica
// de un paciente — "guardar" inserta una versión nueva (reemplaza_a
// apunta a la anterior) y marca la anterior vigente=false. Así un
// guardado con el formulario vacío (por ejemplo, por una falla al
// cargar los datos) no puede borrar una versión buena ya capturada.

export async function obtenerHistoriaClinicaVigente(pacienteId: number) {
  const { rows } = await query(
    `SELECT ${COLUMNAS} FROM historia_clinica WHERE paciente_id = $1 AND vigente = true ORDER BY id DESC LIMIT 1`,
    [pacienteId]
  );
  return rows[0] ?? null;
}

export async function guardarHistoriaClinica(
  pacienteId: number,
  body: Record<string, unknown>,
  identidad: { usuarioId: number | null; nombre: string }
) {
  const { rows: vigenteRows } = await query<{ id: number }>(
    `SELECT id FROM historia_clinica WHERE paciente_id = $1 AND vigente = true`,
    [pacienteId]
  );
  const anteriorId = vigenteRows[0]?.id ?? null;

  // Marca la versión anterior como no vigente ANTES de insertar la
  // nueva — si fuera al revés, por un instante habría dos filas
  // vigentes para el mismo paciente, lo que viola el índice único
  // parcial que garantiza "solo una vigente a la vez".
  if (anteriorId !== null) {
    await query(`UPDATE historia_clinica SET vigente = false WHERE id = $1`, [anteriorId]);
  }

  const valores = CAMPOS.map((campo) => body[campo] ?? null);
  const placeholders = CAMPOS.map((_, i) => `$${i + 5}`).join(", ");

  const { rows } = await query(
    `INSERT INTO historia_clinica (paciente_id, creado_por, creado_por_nombre, reemplaza_a, ${CAMPOS.join(", ")})
     VALUES ($1, $2, $3, $4, ${placeholders})
     RETURNING ${COLUMNAS}`,
    [pacienteId, identidad.usuarioId, identidad.nombre, anteriorId, ...valores]
  );

  return rows[0];
}
