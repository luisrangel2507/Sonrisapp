// Sesión firmada sin dependencias externas (Web Crypto — funciona tanto
// en middleware/Edge como en route handlers/Node). Un único usuario
// admin (consultorio), no hay tabla de usuarios: las credenciales
// viven en APP_LOGIN_USER / APP_LOGIN_PASSWORD.

export const COOKIE_SESION = "sonrisapp_session";
const SESION_DIAS = 30;
export const SESION_MAX_AGE_SEGUNDOS = SESION_DIAS * 24 * 60 * 60;

function getClaveSecreta() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error("SESSION_SECRET no configurado");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function aBase64Url(bytes: ArrayBuffer) {
  const arr = new Uint8Array(bytes);
  let str = "";
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(b64url: string) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64url.length / 4) * 4, "=");
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

export async function crearSesionToken() {
  const exp = Date.now() + SESION_MAX_AGE_SEGUNDOS * 1000;
  const payloadBytes = new TextEncoder().encode(String(exp));
  const clave = await getClaveSecreta();
  const firma = await crypto.subtle.sign("HMAC", clave, payloadBytes);
  return `${aBase64Url(payloadBytes.buffer as ArrayBuffer)}.${aBase64Url(firma)}`;
}

export async function verificarSesionToken(token: string | undefined | null) {
  if (!token) return false;
  const [payloadB64, firmaB64] = token.split(".");
  if (!payloadB64 || !firmaB64) return false;
  try {
    const clave = await getClaveSecreta();
    const payloadBytes = deBase64Url(payloadB64);
    const firmaBytes = deBase64Url(firmaB64);
    const valido = await crypto.subtle.verify("HMAC", clave, firmaBytes, payloadBytes);
    if (!valido) return false;
    const exp = Number(new TextDecoder().decode(payloadBytes));
    return Number.isFinite(exp) && exp > Date.now();
  } catch {
    return false;
  }
}

// Comparación en tiempo aproximadamente constante — evita que un
// early-return de === filtre cuántos caracteres coincidieron.
export function compararSeguro(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Hash de contraseñas de la tabla `usuarios` — PBKDF2 vía Web Crypto
// (sin dependencias externas, igual que el resto de este archivo).
const PBKDF2_ITERACIONES = 100_000;

async function derivarPBKDF2(contrasena: string, salt: Uint8Array) {
  const claveBase = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(contrasena),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERACIONES, hash: "SHA-256" },
    claveBase,
    256
  );
}

export async function hashContrasena(contrasena: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await derivarPBKDF2(contrasena, salt);
  return `${aBase64Url(salt.buffer as ArrayBuffer)}.${aBase64Url(bits)}`;
}

export async function verificarContrasena(contrasena: string, hashGuardado: string) {
  const [saltB64, hashB64] = hashGuardado.split(".");
  if (!saltB64 || !hashB64) return false;
  const salt = deBase64Url(saltB64);
  const bits = await derivarPBKDF2(contrasena, salt);
  return compararSeguro(aBase64Url(bits), hashB64);
}
