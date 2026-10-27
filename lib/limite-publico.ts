import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// IP real del visitante: Railway pasa la original como primer valor de
// x-forwarded-for.
export function ipDe(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "desconocida";
}

// Cuenta una llamada de esta IP a `accion` y regresa una respuesta 429 si
// ya pasó de `max` llamadas en los últimos `minutos` (o 413 si el cuerpo
// pesa más de `maxBytes`); si no, null.
export async function limitarPublico(req: NextRequest, accion: string, max: number, minutos: number, maxBytes = 1_000_000) {
  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > maxBytes) {
    return NextResponse.json({ error: "La información enviada es demasiado grande." }, { status: 413 });
  }
  const clave = `${accion}:${ipDe(req)}`.slice(0, 200);
  const { rows } = await query<{ conteo: number }>(
    `INSERT INTO limites_publicos (clave, ventana_inicio, conteo) VALUES ($1, now(), 1)
     ON CONFLICT (clave) DO UPDATE SET
       conteo = CASE WHEN limites_publicos.ventana_inicio < now() - make_interval(mins => $2) THEN 1 ELSE limites_publicos.conteo + 1 END,
       ventana_inicio = CASE WHEN limites_publicos.ventana_inicio < now() - make_interval(mins => $2) THEN now() ELSE limites_publicos.ventana_inicio END
     RETURNING conteo`,
    [clave, minutos]
  );
  if (rows[0].conteo > max) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento e inténtalo de nuevo." },
      { status: 429 }
    );
  }
  return null;
}
