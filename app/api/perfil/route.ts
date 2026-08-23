import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Límite generoso para la imagen ya comprimida en el cliente (data
// URL base64) — evita que alguien mande un archivo enorme sin querer.
const FOTO_MAX_BYTES = 2_000_000;
const NOMBRE_BIENVENIDA_MAX = 60;

export async function GET() {
  try {
    const { rows } = await query<{ foto: string | null; nombre_bienvenida: string | null }>(
      `SELECT foto, nombre_bienvenida FROM perfil_dentista WHERE id = 1`
    );
    return NextResponse.json({
      foto: rows[0]?.foto ?? null,
      nombre_bienvenida: rows[0]?.nombre_bienvenida ?? null,
    });
  } catch (err) {
    return errorJson(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // Solo se actualiza lo que realmente vino en la petición — así
    // guardar el nombre de bienvenida no borra la foto, y viceversa.
    const fotoProvista = Object.prototype.hasOwnProperty.call(body, "foto");
    const nombreProvisto = Object.prototype.hasOwnProperty.call(body, "nombre_bienvenida");
    const foto = body?.foto ?? null;
    const nombreBienvenida = body?.nombre_bienvenida ?? null;

    if (fotoProvista && foto !== null) {
      if (typeof foto !== "string" || !foto.startsWith("data:image/")) {
        return NextResponse.json({ error: "foto inválida" }, { status: 400 });
      }
      if (foto.length > FOTO_MAX_BYTES) {
        return NextResponse.json({ error: "la imagen es demasiado grande" }, { status: 400 });
      }
    }

    if (nombreProvisto && nombreBienvenida !== null) {
      if (typeof nombreBienvenida !== "string" || nombreBienvenida.length > NOMBRE_BIENVENIDA_MAX) {
        return NextResponse.json({ error: "nombre inválido" }, { status: 400 });
      }
    }

    const { rows } = await query<{ foto: string | null; nombre_bienvenida: string | null }>(
      `INSERT INTO perfil_dentista (id, foto, nombre_bienvenida, actualizado_en)
       VALUES (1, $1, $2, now())
       ON CONFLICT (id) DO UPDATE SET
         foto = CASE WHEN $3 THEN $1 ELSE perfil_dentista.foto END,
         nombre_bienvenida = CASE WHEN $4 THEN $2 ELSE perfil_dentista.nombre_bienvenida END,
         actualizado_en = now()
       RETURNING foto, nombre_bienvenida`,
      [foto, nombreBienvenida, fotoProvista, nombreProvisto]
    );

    return NextResponse.json(rows[0]);
  } catch (err) {
    return errorJson(err);
  }
}
