import { createHmac, randomBytes } from "node:crypto";
import { query } from "@/lib/db";
import { cifrar, descifrar } from "@/lib/crypto";

// Códigos de 6 dígitos que cambian cada 30 s (RFC 6238), compatibles con
// Google Authenticator, Microsoft Authenticator o las Contraseñas de iPhone.
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function aBase32(buf: Buffer) {
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALFABETO[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function deBase32(txt: string) {
  let bits = "";
  for (const c of txt.replace(/=+$/, "").toUpperCase()) {
    const v = ALFABETO.indexOf(c);
    if (v >= 0) bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function nuevoSecretoTotp() {
  return aBase32(randomBytes(20));
}

function codigoEn(secreto: string, paso: number) {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(paso));
  const h = createHmac("sha1", deBase32(secreto)).update(contador).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

// Acepta el código actual y el de 30 s antes/después (relojes desfasados).
export function verificarCodigoTotp(secreto: string, codigo: string) {
  const limpio = String(codigo ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(limpio)) return false;
  const paso = Math.floor(Date.now() / 30_000);
  return [-1, 0, 1].some((d) => codigoEn(secreto, paso + d) === limpio);
}

export function uriTotp(secreto: string, cuenta: string) {
  const emisor = "Sonrisapp";
  return `otpauth://totp/${encodeURIComponent(`${emisor}:${cuenta}`)}?secret=${secreto}&issuer=${emisor}&digits=6&period=30`;
}

// Dónde vive el secreto de cada identidad: fila en `usuarios`, o la cuenta
// admin de variables de entorno (usuarioId null) en `seguridad`.
export async function leerTotp(usuarioId: number | null) {
  const { rows } =
    usuarioId == null
      ? await query<{ s: string | null; p: string | null }>(
          `SELECT admin_totp_secreto AS s, admin_totp_pendiente AS p FROM seguridad WHERE id = 1`
        )
      : await query<{ s: string | null; p: string | null }>(
          `SELECT totp_secreto AS s, totp_pendiente AS p FROM usuarios WHERE id = $1`,
          [usuarioId]
        );
  return { secreto: descifrar(rows[0]?.s ?? null), pendiente: descifrar(rows[0]?.p ?? null) };
}

export async function guardarTotp(usuarioId: number | null, campos: { secreto?: string | null; pendiente?: string | null }) {
  const sets: string[] = [];
  const valores: unknown[] = [];
  const col = (c: "secreto" | "pendiente") =>
    usuarioId == null ? (c === "secreto" ? "admin_totp_secreto" : "admin_totp_pendiente") : c === "secreto" ? "totp_secreto" : "totp_pendiente";
  for (const c of ["secreto", "pendiente"] as const) {
    if (c in campos) {
      valores.push(campos[c] ? cifrar(campos[c]) : null);
      sets.push(`${col(c)} = $${valores.length}`);
    }
  }
  if (sets.length === 0) return;
  if (usuarioId == null) await query(`UPDATE seguridad SET ${sets.join(", ")} WHERE id = 1`, valores);
  else {
    valores.push(usuarioId);
    await query(`UPDATE usuarios SET ${sets.join(", ")} WHERE id = $${valores.length}`, valores);
  }
}
