import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { obtenerRpIdYOrigin } from "@/lib/webauthn-origin";
import { acortarLink } from "@/lib/link-corto";

export const dynamic = "force-dynamic";

// El link para Instagram (/agendar) no cambia, así que el acortado se
// genera una sola vez y se reutiliza — evita pegarle al servicio
// externo en cada clic y que un límite de uso tumbe el botón.
export async function GET(req: NextRequest) {
  try {
    const { origin } = obtenerRpIdYOrigin(req);
    const completo = `${origin}/agendar`;

    const { rows } = await query<{ link_agendar_corto: string | null }>(
      `SELECT link_agendar_corto FROM perfil_dentista WHERE id = 1`
    );
    const existente = rows[0]?.link_agendar_corto ?? null;
    if (existente) {
      return NextResponse.json({ link: existente, completo });
    }

    const corto = await acortarLink(completo);
    if (corto) {
      await query(
        `INSERT INTO perfil_dentista (id, link_agendar_corto) VALUES (1, $1)
         ON CONFLICT (id) DO UPDATE SET link_agendar_corto = $1`,
        [corto]
      );
      return NextResponse.json({ link: corto, completo });
    }

    return NextResponse.json({ link: completo, completo });
  } catch (err) {
    return errorJson(err);
  }
}
