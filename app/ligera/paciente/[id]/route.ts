import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { esc, identidadLigera, irA, pagina } from "@/lib/ligera";

export const dynamic = "force-dynamic";

// Ficha mínima del paciente en la versión ligera: llenar historia clínica
// o firmar sus consentimientos pendientes en el iPad del consultorio.
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!(await identidadLigera(req))) return irA(req, "/ligera");
  const id = Number((await props.params).id);
  const { rows } = await query<{ nombre: string; folio: string | null }>(`SELECT nombre, folio FROM pacientes WHERE id = $1`, [id]);
  if (!rows[0]) return irA(req, "/ligera/pacientes");
  const { rows: consentimientos } = await query<{ token: string; titulo: string }>(
    `SELECT token, titulo FROM consentimientos
     WHERE paciente_id = $1 AND estado = 'pendiente' AND (expira_en IS NULL OR expira_en > now())
     ORDER BY id DESC`,
    [id]
  );
  const aviso = req.nextUrl.searchParams.get("aviso");
  return pagina(
    rows[0].nombre,
    `<div class="tarjeta"><h1>${esc(rows[0].nombre)}</h1><p class="muted">${esc(rows[0].folio ?? "")}</p>
      ${aviso ? `<p class="ok">${esc(aviso)}</p>` : ""}
      <p class="muted">Dale el iPad al paciente para que lo llene o firme.</p>
      <a class="btn ancho" href="/ligera/paciente/${id}/historia">Llenar historia clínica</a>
    </div>
    <div class="tarjeta"><h1 style="font-size:18px">Consentimientos por firmar</h1>
      ${
        consentimientos.length
          ? consentimientos
              .map((c) => `<a class="btn btn2 ancho" href="/ligera/consentimiento/${encodeURIComponent(c.token)}?p=${id}">${esc(c.titulo)}</a>`)
              .join("")
          : `<p class="muted">No tiene consentimientos pendientes. Se crean desde la app normal, en la ficha del paciente.</p>`
      }
    </div>
    <p style="text-align:center"><a class="btn btn2" href="/ligera/pacientes">Otro paciente</a> <a class="btn btn2" href="/ligera">Menú</a></p>`
  );
}
