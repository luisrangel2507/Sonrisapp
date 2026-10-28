import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "@/lib/db";
import { cifrar, cifradoDisponible } from "@/lib/crypto";
import { enviarAvisos2hAntes, enviarRecordatoriosHoraAntes, enviarResumenDiario } from "@/lib/cron/recordatorios";
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
  const sesion = process.env.SESSION_SECRET ?? "";
  if (sesion.length < 32) {
    console.warn("[seguridad] SESSION_SECRET es corto o falta — usa al menos 32 caracteres aleatorios; con un secreto débil se pueden falsificar sesiones.");
  }
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

// Programador interno: no depende de que alguien configure un cron
// externo. Cada 5 minutos revisa los avisos de 2h/1h antes de la cita,
// y desde las 8am (hora de México) manda el resumen del día. Todo es
// idempotente en la base (banderas por cita y avisos_*_diarios), así
// que convive sin duplicar con /api/cron si también está configurado.
const INTERVALO_MS = 5 * 60 * 1000;

function horaMexico() {
  return Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Mexico_City" }).format(new Date())
  );
}

async function tick() {
  try {
    await enviarAvisos2hAntes();
    await enviarRecordatoriosHoraAntes();
    const hora = horaMexico();
    if (hora >= 8 && hora < 12) await enviarResumenDiario();
  } catch (err) {
    console.error("[programador] error en avisos:", err);
  }
}

export function iniciarProgramador() {
  if (process.env.DESACTIVAR_PROGRAMADOR === "1") return;
  const g = globalThis as { __programadorSonrisa?: boolean };
  if (g.__programadorSonrisa) return;
  g.__programadorSonrisa = true;
  setTimeout(tick, 30_000);
  setInterval(tick, INTERVALO_MS).unref?.();
  console.log("[programador] avisos de citas activos (cada 5 min, resumen a las 8am).");
}
