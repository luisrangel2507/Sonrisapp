import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, leerSesion, type IdentidadSesion } from "@/lib/auth";
import { sesionVigente } from "@/lib/sesion-vigente";

// Versión ligera (/ligera) para iPads y navegadores viejos (Safari 12, iOS
// 12): HTML hecho en el servidor, sin JavaScript y con CSS sencillo
// (sin gap en flex, sin aspect-ratio ni inset), para que funcione donde la
// app normal (React 19 / Next 16, Safari 16.4+) no carga.

export const ZONA = "America/Mexico_City";

export function esc(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function identidadLigera(req: NextRequest): Promise<IdentidadSesion | null> {
  const s = await leerSesion(req.cookies.get(COOKIE_SESION)?.value);
  if (!s || !(await sesionVigente(s.identidad, s.iat))) return null;
  return s.identidad;
}

export function dinero(n: number) {
  return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const CSS = `
*{box-sizing:border-box}
body{margin:0;background:#F5F1EA;color:#2b2118;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:17px;-webkit-text-size-adjust:100%}
.cont{max-width:720px;margin:0 auto;padding:16px}
.cab{text-align:center;padding:10px 0 6px}
.cab img{width:220px;max-width:70%}
.tarjeta{background:#fff;border:1px solid #EFE9DC;border-radius:18px;padding:16px;margin:12px 0}
h1{font-size:22px;margin:4px 0 10px;font-family:Georgia,serif}
.muted{color:#8a8272;font-size:14px}
.btn{display:inline-block;border:0;border-radius:999px;padding:12px 18px;font-size:16px;font-weight:bold;text-decoration:none;color:#fff;background:#7A1E33;margin:4px 6px 4px 0;-webkit-appearance:none}
.btn2{background:#fff;color:#7A1E33;border:1px solid #E3C3C9}
.verde{background:#3F6B33}
.ancho{display:block;width:100%;text-align:center;margin:8px 0}
input,select{font-size:17px;padding:11px;border:1px solid #EFE9DC;border-radius:12px;width:100%;margin:4px 0 10px;background:#fff;-webkit-appearance:none}
input[type=radio]{-webkit-appearance:radio;appearance:auto}
input[type=checkbox]{-webkit-appearance:checkbox;appearance:auto}
input[type=radio],input[type=checkbox]{width:22px;height:22px;padding:0;border:0;margin:0 8px 0 0;vertical-align:middle;display:inline-block}
label{font-size:13px;color:#a49c8a;font-weight:bold;text-transform:uppercase}
.err{color:#B0503A;font-weight:bold}
.ok{color:#3F6B33;font-weight:bold}
.fila{overflow:hidden}
.izq{float:left}.der{float:right}
.etq{display:inline-block;border-radius:999px;padding:3px 10px;font-size:13px;font-weight:bold}
.agendada{background:#F5E7E9;color:#803449}.completada{background:#EEF4EA;color:#3F6B33}.cancelada{background:#EEE;color:#888}
.pagof input,.pagof select{width:auto;display:inline-block;margin-right:6px}
.nav{text-align:center;margin:8px 0}
`;

export function pagina(titulo: string, cuerpo: string, extraHead = "") {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(titulo)} — Viña Sonrisas</title>${extraHead}<style>${CSS}</style></head>
<body><div class="cont"><div class="cab"><img src="/logo-vina-sonrisas.png" alt="Viña Sonrisas"></div>${cuerpo}</div></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

// Después de un POST se redirige con 303 para que recargar no repita la acción.
export function irA(req: NextRequest, ruta: string) {
  return NextResponse.redirect(new URL(ruta, req.url), 303);
}

// Llama a la API de la propia app (misma lógica, permisos y bitácora que la
// app normal) reenviando la cookie de quien hizo la petición.
export function apiInterna(req: NextRequest, ruta: string, metodo = "GET", cuerpo?: unknown) {
  return fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: "no-store",
  });
}
