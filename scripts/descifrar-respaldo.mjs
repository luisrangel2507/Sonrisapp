// Descifra un respaldo diario (.snrb) a JSON legible.
// Uso: RESPALDO_KEY=<64 hex> node scripts/descifrar-respaldo.mjs respaldo.snrb > respaldo.json
import { readFileSync } from "node:fs";
import { createDecipheriv } from "node:crypto";
import { gunzipSync } from "node:zlib";

const archivo = readFileSync(process.argv[2]);
const clave = Buffer.from(process.env.RESPALDO_KEY ?? "", "hex");
if (clave.length !== 32) throw new Error("Falta RESPALDO_KEY (64 caracteres hex)");
if (archivo.subarray(0, 5).toString() !== "SNRB1") throw new Error("No es un respaldo de Sonrisapp");
const d = createDecipheriv("aes-256-gcm", clave, archivo.subarray(5, 17));
d.setAuthTag(archivo.subarray(17, 33));
const gz = Buffer.concat([d.update(archivo.subarray(33)), d.final()]);
process.stdout.write(gunzipSync(gz).toString("utf8"));
