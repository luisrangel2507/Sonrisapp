import { query } from "@/lib/db";
import {
  HISTORIA_CLINICA_CAMPOS as CAMPOS,
  HISTORIA_CLINICA_COLUMNAS as COLUMNAS,
  HISTORIA_CLINICA_CAMPOS_CIFRABLES as CIFRABLES,
} from "@/lib/historia-clinica-campos";
import { cifrar, descifrar } from "@/lib/crypto";

// Trazabilidad tipo NOM-024: nunca se sobrescribe la historia clínica
// de un paciente — "guardar" inserta una versión nueva (reemplaza_a
// apunta a la anterior) y marca la anterior vigente=false. Así un
// guardado con el formulario vacío (por ejemplo, por una falla al
// cargar los datos) no puede borrar una versión buena ya capturada.
//
// El contenido sensible (ver HISTORIA_CLINICA_CAMPOS_CIFRABLES) se
// guarda cifrado (NOM-024) y se descifra al leer.

function descifrarFila<T extends Record<string, unknown>>(fila: T): T {
  const copia = { ...fila };
  for (const campo of Array.from(CIFRABLES)) {
    if (campo in copia) (copia as Record<string, unknown>)[campo] = descifrar(copia[campo] as string | null);
  }
  return copia;
}

export async function obtenerHistoriaClinicaVigente(pacienteId: number) {
  const { rows } = await query(
    `SELECT ${COLUMNAS} FROM historia_clinica WHERE paciente_id = $1 AND vigente = true ORDER BY id DESC LIMIT 1`,
    [pacienteId]
  );
  return rows[0] ? descifrarFila(rows[0]) : null;
}

// Cuando el paciente llena/actualiza su historial desde el link
// público, la nueva versión queda sin confirmar hasta que la doctora
// la revise (ver /historia-clinica/confirmar). Cuando la captura o
// corrige la doctora desde el dashboard, queda confirmada de una vez
// — ella misma la está revisando en ese momento.
export async function guardarHistoriaClinica(
  pacienteId: number,
  body: Record<string, unknown>,
  identidad: { usuarioId: number | null; nombre: string },
  opts: { esPublico?: boolean } = {}
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

  const confirmado = !opts.esPublico;

  const valores = CAMPOS.map((campo) => {
    const valor = (body[campo] as string | null | undefined) ?? null;
    return CIFRABLES.has(campo) ? cifrar(valor) : valor;
  });
  const placeholders = CAMPOS.map((_, i) => `$${i + 8}`).join(", ");

  const { rows } = await query(
    `INSERT INTO historia_clinica (paciente_id, creado_por, creado_por_nombre, reemplaza_a, confirmado, confirmado_por_nombre, confirmado_en, ${CAMPOS.join(", ")})
     VALUES ($1, $2, $3, $4, $5, $6, $7, ${placeholders})
     RETURNING ${COLUMNAS}`,
    [
      pacienteId,
      identidad.usuarioId,
      identidad.nombre,
      anteriorId,
      confirmado,
      confirmado ? identidad.nombre : null,
      confirmado ? new Date() : null,
      ...valores,
    ]
  );

  return descifrarFila(rows[0]);
}

// Marca la versión vigente como confirmada por la doctora sin cambiar
// el contenido — para cuando revisó el historial y está todo
// correcto tal como lo llenó el paciente.
export async function confirmarHistoriaClinica(pacienteId: number, identidad: { nombre: string }) {
  const { rows } = await query(
    `UPDATE historia_clinica
     SET confirmado = true, confirmado_por_nombre = $2, confirmado_en = now()
     WHERE paciente_id = $1 AND vigente = true
     RETURNING ${COLUMNAS}`,
    [pacienteId, identidad.nombre]
  );
  return rows[0] ? descifrarFila(rows[0]) : null;
}
