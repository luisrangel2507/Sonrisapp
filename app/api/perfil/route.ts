import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Límite generoso para la imagen ya comprimida en el cliente (data
// URL base64) — evita que alguien mande un archivo enorme sin querer.
const FOTO_MAX_BYTES = 2_000_000;

export async function GET() {
  try {
    const { rows } = await query<{ foto: string | null }>(
      `SELECT foto FROM perfil_dentista WHERE id = 1`
    );
    return NextResponse.json({ foto: rows[0]?.foto ?? null });
  } catch (err) {
    return errorJson(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const foto = body?.foto ?? null;

    if (foto !== null) {
      if (typeof foto !== "string" || !foto.startsWith("data:image/")) {
        return NextResponse.json({ error: "foto inválida" }, { status: 400 });
      }
      if (foto.length > FOTO_MAX_BYTES) {
        return NextResponse.json({ error: "la imagen es demasiado grande" }, { status: 400 });
      }
    }

    await query(
      `INSERT INTO perfil_dentista (id, foto, actualizado_en) VALUES (1, $1, now())
       ON CONFLICT (id) DO UPDATE SET foto = $1, actualizado_en = now()`,
      [foto]
    );

    return NextResponse.json({ foto });
  } catch (err) {
    return errorJson(err);
  }
}
