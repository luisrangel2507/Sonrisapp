import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { query } from "@/lib/db";

// Respaldo completo de la base: todas las tablas del esquema público como
// JSON comprimido. Los campos clínicos ya van cifrados con ENCRYPTION_KEY;
// el respaldo automático además se cifra entero con RESPALDO_KEY (64
// caracteres hex) para poder guardarlo fuera de Railway.
export async function generarRespaldoJson(): Promise<Buffer> {
  const { rows: tablas } = await query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  const datos: Record<string, unknown[]> = {};
  for (const { tablename } of tablas) {
    const { rows } = await query(`SELECT * FROM "${tablename.replace(/"/g, '""')}"`);
    datos[tablename] = rows;
  }
  const contenido = { generado_en: new Date().toISOString(), version: 1, tablas: datos };
  return gzipSync(Buffer.from(JSON.stringify(contenido)));
}

const MAGIA = Buffer.from("SNRB1");

function claveRespaldo() {
  const hex = process.env.RESPALDO_KEY?.trim();
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return Buffer.from(hex, "hex");
}

export function hayClaveRespaldo() {
  return claveRespaldo() !== null;
}

// Formato: "SNRB1" + iv (12) + tag (16) + datos cifrados (AES-256-GCM).
export function cifrarRespaldo(gz: Buffer): Buffer {
  const clave = claveRespaldo();
  if (!clave) throw new Error("RESPALDO_KEY no configurada");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", clave, iv);
  const cifrado = Buffer.concat([cipher.update(gz), cipher.final()]);
  return Buffer.concat([MAGIA, iv, cipher.getAuthTag(), cifrado]);
}

export function descifrarRespaldo(archivo: Buffer, clave: Buffer): unknown {
  if (!archivo.subarray(0, 5).equals(MAGIA)) throw new Error("no es un respaldo de Sonrisapp");
  const iv = archivo.subarray(5, 17);
  const tag = archivo.subarray(17, 33);
  const decipher = createDecipheriv("aes-256-gcm", clave, iv);
  decipher.setAuthTag(tag);
  const gz = Buffer.concat([decipher.update(archivo.subarray(33)), decipher.final()]);
  return JSON.parse(gunzipSync(gz).toString("utf8"));
}
