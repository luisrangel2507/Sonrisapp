import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "@/lib/db";
import { cifrar, cifradoDisponible } from "@/lib/crypto";
import { HISTORIA_CLINICA_CAMPOS_CIFRABLES } from "@/lib/historia-clinica-campos";

export async function aplicarSchema() {
  try {
    const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
    await query(sql);
    console.log("[schema] db/schema.sql aplicado correctamente.");
  } catch (err) {
    console.error("[schema] no se pudo aplicar db/schema.sql al arrancar:", err);
  }

  await cifrarDatosExistentes();
}

// Cifra en reposo (NOM-024) el contenido que quedó en texto plano de
// antes de activar ENCRYPTION_KEY. Corre en cada arranque pero solo
// toca filas sin el prefijo "enc:v1:" — una vez migradas, las
// siguientes corridas no encuentran nada que hacer. Si no hay llave
// configurada, no hace nada (la app sigue funcionando en texto plano
// hasta que se configure).
async function migrarColumna(tabla: string, idColumna: string, columna: string) {
  const { rows } = await query<{ id: number; valor: string }>(
    `SELECT ${idColumna} AS id, ${columna} AS valor FROM ${tabla}
     WHERE ${columna} IS NOT NULL AND ${columna} <> '' AND ${columna} NOT LIKE 'enc:v1:%'`
  );
  for (const fila of rows) {
    await query(`UPDATE ${tabla} SET ${columna} = $1 WHERE ${idColumna} = $2`, [cifrar(fila.valor), fila.id]);
  }
  if (rows.length > 0) {
    console.log(`[cifrado] ${rows.length} fila(s) migradas en ${tabla}.${columna}`);
  }
}

async function cifrarDatosExistentes() {
  if (!cifradoDisponible()) {
    console.log("[cifrado] ENCRYPTION_KEY no configurada — el contenido clínico queda sin cifrar por ahora.");
    return;
  }
  try {
    for (const columna of Array.from(HISTORIA_CLINICA_CAMPOS_CIFRABLES)) {
      await migrarColumna("historia_clinica", "id", columna);
    }
    for (const columna of ["alergias_cual", "medicamentos", "antecedentes_medicos_cual"]) {
      await migrarColumna("pacientes", "id", columna);
    }
    for (const columna of ["nota", "tratamiento", "duracion", "archivo"]) {
      await migrarColumna("paciente_notas", "id", columna);
    }
    await migrarColumna("diente_historial", "id", "nota");
    console.log("[cifrado] migración de datos existentes revisada.");
  } catch (err) {
    console.error("[cifrado] error migrando datos existentes a cifrado:", err);
  }
}
