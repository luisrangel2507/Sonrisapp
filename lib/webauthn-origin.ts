import type { NextRequest } from "next/server";

// req.nextUrl.hostname refleja el Host que ve Next.js internamente —
// detrás del proxy de Railway eso resuelve a "localhost", no al
// dominio público real, lo que hace que el navegador rechace el rpID
// ("The RP ID ... is invalid for this domain"). X-Forwarded-Host / -Proto
// sí traen los valores reales que vio el proxy.
export function obtenerRpIdYOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
  const rpID = host.split(":")[0];
  const origin = `${proto}://${host}`;
  return { rpID, origin };
}
