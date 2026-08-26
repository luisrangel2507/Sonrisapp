import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Cifrado en reposo (NOM-024-SSA3-2012) para el contenido clínico
// sensible: historia clínica, notas, archivos adjuntos. AES-256-GCM
// con una llave en ENCRYPTION_KEY (64 caracteres hex = 32 bytes).
//
// Si la llave no está configurada, cifrar() regresa el texto tal cual
// — así la app nunca se rompe por falta de la variable de entorno; el
// cifrado simplemente queda pendiente de activarse. descifrar() detecta
// con un prefijo si un valor ya está cifrado, así que datos viejos en
// texto plano se siguen leyendo bien mientras se van migrando.
const PREFIJO = "enc:v1:";

function obtenerLlave(): Buffer | null {
  const clave = process.env.ENCRYPTION_KEY;
  if (!clave || clave.length !== 64) return null;
  try {
    const llave = Buffer.from(clave, "hex");
    return llave.length === 32 ? llave : null;
  } catch {
    return null;
  }
}

export function cifradoDisponible() {
  return obtenerLlave() !== null;
}

export function cifrar(texto: string | null | undefined): string | null {
  if (texto === null || texto === undefined) return null;
  const llave = obtenerLlave();
  if (!llave) return texto;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", llave, iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIJO + Buffer.concat([iv, authTag, cifrado]).toString("base64");
}

export function descifrar(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  if (!valor.startsWith(PREFIJO)) return valor;
  const llave = obtenerLlave();
  if (!llave) return valor;
  try {
    const datos = Buffer.from(valor.slice(PREFIJO.length), "base64");
    const iv = datos.subarray(0, 12);
    const authTag = datos.subarray(12, 28);
    const cifrado = datos.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", llave, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString("utf8");
  } catch {
    return valor;
  }
}

export function estaCifrado(valor: string | null | undefined) {
  return typeof valor === "string" && valor.startsWith(PREFIJO);
}
