import type { NextRequest } from "next/server";

// Compara recortando espacios en ambos lados — un espacio o salto de
// línea de más al pegar el secreto en Railway o en GitHub (muy fácil
// que pase desde el teclado de un celular) no debe tumbar el cron.
export function autorizadoParaCron(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")?.trim();
  const esperado = process.env.CRON_SECRET?.trim();
  return Boolean(esperado) && secret === esperado;
}
