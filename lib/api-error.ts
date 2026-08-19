import { NextResponse } from "next/server";

// Los route handlers de Next no capturan errores no manejados con un
// boundary propio — sin este wrapper, un error de Postgres se
// convierte en un 500 con cuerpo vacío (imposible de diagnosticar
// desde el cliente). Devuelve siempre el mensaje real en JSON.
export function errorJson(err: unknown, status = 500) {
  const mensaje = err instanceof Error ? err.message : "Error desconocido";
  console.error(mensaje);
  return NextResponse.json({ error: mensaje }, { status });
}
