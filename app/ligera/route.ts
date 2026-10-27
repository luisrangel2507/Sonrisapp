import { NextRequest } from "next/server";
import { esc, identidadLigera, pagina } from "@/lib/ligera";

export const dynamic = "force-dynamic";

// Entrada de la versión ligera: formulario de acceso o menú.
export async function GET(req: NextRequest) {
  const identidad = await identidadLigera(req);
  const error = req.nextUrl.searchParams.get("error");
  const pideCodigo = req.nextUrl.searchParams.get("codigo") === "1";
  const usuario = req.nextUrl.searchParams.get("u") ?? "";

  if (!identidad) {
    return pagina(
      "Entrar",
      `<div class="tarjeta"><h1>Entrar</h1>
      <p class="muted">Versión ligera para iPads y navegadores anteriores.</p>
      ${error ? `<p class="err">${esc(error)}</p>` : ""}
      <form method="post" action="/ligera/entrar">
        <label>Usuario</label><input name="usuario" value="${esc(usuario)}" autocapitalize="none" autocorrect="off">
        <label>Contraseña</label><input name="contrasena" type="password">
        ${pideCodigo ? `<label>Código de verificación</label><input name="codigo" inputmode="numeric" maxlength="6" autocomplete="one-time-code">` : ""}
        <button class="btn ancho" type="submit">Entrar</button>
      </form></div>`
    );
  }

  return pagina(
    "Menú",
    `<div class="tarjeta"><h1>Hola, ${esc(identidad.nombre.split(" ").slice(0, 2).join(" "))}</h1>
    <a class="btn ancho" href="/ligera/agenda">Agenda de hoy</a>
    <a class="btn btn2 ancho" href="/ligera/pacientes">Pacientes: historia clínica y consentimientos</a>
    <a class="btn btn2 ancho" href="/ligera/sala">Pantalla de sala de espera</a>
    <form method="post" action="/ligera/salir"><button class="btn btn2 ancho" type="submit">Salir</button></form>
    <p class="muted">Para todo lo demás (odontograma, presupuestos, reportes) usa la app normal en un celular o iPad reciente.</p>
    </div>`
  );
}
