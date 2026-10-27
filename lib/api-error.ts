import { NextResponse } from "next/server";

// Los route handlers de Next no capturan errores no manejados con un
// boundary propio — sin este wrapper, un error de Postgres se
// convierte en un 500 con cuerpo vacío (imposible de diagnosticar
// desde el cliente). El mensaje real va al log del servidor; en
// producción el cliente solo recibe uno genérico, para no revelar
// detalles internos (tablas, columnas, consultas) a quien pruebe la API.
export function errorJson(err: unknown, status = 500) {
  const mensaje = err instanceof Error ? err.message : "Error desconocido";
  console.error(err);
  const publico = process.env.NODE_ENV === "production" ? "Ocurrió un error, intenta de nuevo." : mensaje;
  return NextResponse.json({ error: publico }, { status });
}
