import { NextRequest } from "next/server";
import { COOKIE_TV, TV_MAX_AGE_SEGUNDOS, verificarTokenTv } from "@/lib/auth";
import { estadoTv, versionTv } from "@/lib/tv";
import { esc, identidadLigera, irA, pagina } from "@/lib/ligera";

export const dynamic = "force-dynamic";

// Pantalla de sala de espera para iPads/TVs viejos. Entra con la sesión, o
// con el link de "Vincular TV" (/ligera/sala?clave=…), que solo da acceso a
// esta pantalla. Se recarga sola cada 15 s (sin JavaScript).
export async function GET(req: NextRequest) {
  const clave = req.nextUrl.searchParams.get("clave");
  if (clave) {
    const tv = await verificarTokenTv(clave);
    if (!tv || tv.v !== (await versionTv())) {
      return pagina("Sala", `<div class="tarjeta"><p class="err">Este link ya no es válido. Genera uno nuevo en Pantalla TV.</p></div>`);
    }
    const res = irA(req, "/ligera/sala");
    res.cookies.set(COOKIE_TV, clave, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TV_MAX_AGE_SEGUNDOS,
    });
    return res;
  }

  const conSesion = await identidadLigera(req);
  const tv = conSesion ? null : await verificarTokenTv(req.cookies.get(COOKIE_TV)?.value);
  if (!conSesion && (!tv || tv.v !== (await versionTv()))) return irA(req, "/ligera");

  const estado = await estadoTv();
  const pilas = [...new Set(estado.nombres.map((n) => n.trim().split(/\s+/)[0]).filter(Boolean))];
  const nombre = pilas.length <= 1 ? (pilas[0] ?? "") : `${pilas.slice(0, -1).join(", ")} y ${pilas[pilas.length - 1]}`;
  const ahora = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

  let contenido: string;
  if (estado.modo === "bienvenida" && nombre) {
    contenido = `<div class="grande">${esc(nombre)}</div>
      <div class="sub">Es un gusto poder atenderte.</div>
      <div class="sub2">Tu cita es a las:</div>
      <div class="reloj">${esc(estado.hora ?? ahora)}</div>`;
  } else if (estado.modo === "gracias" && nombre) {
    contenido = `<div class="grande">${esc(nombre)}</div>
      <div class="sub">Gracias por tu visita.</div>
      <div class="reloj chico">¡Cuida tu sonrisa, te esperamos pronto!</div>`;
  } else {
    contenido = `<div class="grande">Bienvenido(a)</div>
      <div class="sub">Es un gusto poder atenderte.</div>
      <div class="reloj">${esc(ahora)}</div>`;
  }

  const estilos = `<meta http-equiv="refresh" content="15"><style>
    body{background:#F7F1EA}
    .cab img{width:360px;max-width:60%}
    .sala{text-align:center;padding-top:3vh}
    .grande{font-family:Georgia,serif;font-weight:bold;color:#7A1E33;font-size:12vw;line-height:1.05}
    .sub{color:#7a6f62;font-size:4.2vw;margin-top:2vh}
    .sub2{color:#7a6f62;font-size:3vw;margin-top:3vh}
    .reloj{display:inline-block;margin-top:1.5vh;padding:1.5vh 6vw;border:1px solid #E6D6C4;border-radius:24px;background:#FBF8F4;
      font-family:Georgia,serif;color:#7A1E33;font-size:11vw}
    .reloj.chico{font-size:4vw;padding:3vh 5vw}
  </style>`;
  return pagina("Sala de espera", `<div class="sala">${contenido}</div>`, estilos);
}
