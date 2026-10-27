import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { esc, identidadLigera, irA, pagina } from "@/lib/ligera";

export const dynamic = "force-dynamic";

// Buscar paciente (versión ligera).
export async function GET(req: NextRequest) {
  if (!(await identidadLigera(req))) return irA(req, "/ligera");
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const { rows } = q
    ? await query<{ id: number; nombre: string; folio: string | null }>(
        `SELECT id, nombre, folio FROM pacientes
         WHERE nombre ILIKE '%' || $1 || '%' OR folio ILIKE '%' || $1 || '%'
         ORDER BY nombre LIMIT 40`,
        [q]
      )
    : { rows: [] as { id: number; nombre: string; folio: string | null }[] };
  const lista = q
    ? rows.length
      ? rows
          .map(
            (p) =>
              `<a class="tarjeta" style="display:block;text-decoration:none;color:#2b2118" href="/ligera/paciente/${p.id}">
                <b>${esc(p.nombre)}</b> <span class="muted">${esc(p.folio ?? "")}</span></a>`
          )
          .join("")
      : `<p class="muted" style="text-align:center">Sin resultados.</p>`
    : "";
  return pagina(
    "Pacientes",
    `<div class="tarjeta"><h1>Buscar paciente</h1>
      <form method="get" action="/ligera/pacientes">
        <input name="q" value="${esc(q)}" placeholder="Nombre o folio" autocomplete="off">
        <button class="btn ancho" type="submit">Buscar</button>
      </form></div>
    ${lista}
    <p style="text-align:center"><a class="btn btn2" href="/ligera">Menú</a></p>`
  );
}
