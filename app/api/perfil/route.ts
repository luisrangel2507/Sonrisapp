import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Límite generoso para la imagen ya comprimida en el cliente (data
// URL base64) — evita que alguien mande un archivo enorme sin querer.
const FOTO_MAX_BYTES = 2_000_000;
const NOMBRE_BIENVENIDA_MAX = 60;
const TELEFONO_MAX = 30;
const LOGO_MAX_BYTES = 2_000_000;
// Campos de texto de la marca: columna -> largo máximo.
const CAMPOS_MARCA: Record<string, number> = {
  clinica_nombre: 80, clinica_lema: 120, color_marca: 9, doctor_nombre: 120,
  doctor_titulo: 80, cedula: 30, direccion: 200, horario: 120,
};

export async function GET() {
  try {
    const { rows } = await query<Record<string, string | null>>(
      `SELECT foto, nombre_bienvenida, telefono, logo, clinica_nombre, clinica_lema, color_marca,
              doctor_nombre, doctor_titulo, cedula, direccion, horario
       FROM perfil_dentista WHERE id = 1`
    );
    const marca: Record<string, string | null> = { logo: rows[0]?.logo ?? null };
    for (const c of Object.keys(CAMPOS_MARCA)) marca[c] = rows[0]?.[c] ?? null;
    return NextResponse.json({
      foto: rows[0]?.foto ?? null,
      nombre_bienvenida: rows[0]?.nombre_bienvenida ?? null,
      telefono: rows[0]?.telefono ?? null,
      ...marca,
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
    const telefonoProvisto = Object.prototype.hasOwnProperty.call(body, "telefono");
    const foto = body?.foto ?? null;
    const nombreBienvenida = body?.nombre_bienvenida ?? null;
    const telefono = body?.telefono ?? null;

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

    if (telefonoProvisto && telefono !== null) {
      if (typeof telefono !== "string" || telefono.length > TELEFONO_MAX) {
        return NextResponse.json({ error: "teléfono inválido" }, { status: 400 });
      }
    }

    // Logo (imagen) y campos de texto de la marca.
    const logoProvisto = Object.prototype.hasOwnProperty.call(body, "logo");
    const logo = body?.logo ?? null;
    if (logoProvisto && logo !== null) {
      if (typeof logo !== "string" || !logo.startsWith("data:image/") || logo.length > LOGO_MAX_BYTES) {
        return NextResponse.json({ error: "logo inválido" }, { status: 400 });
      }
    }
    const marcaCampos: string[] = [];
    const marcaValores: (string | null)[] = [];
    for (const [col, max] of Object.entries(CAMPOS_MARCA)) {
      if (!Object.prototype.hasOwnProperty.call(body, col)) continue;
      let v = body[col];
      v = typeof v === "string" && v.trim() ? v.trim() : null;
      if (v !== null && (v.length > max || (col === "color_marca" && !/^#[0-9a-fA-F]{6}$/.test(v)))) {
        return NextResponse.json({ error: `valor inválido en ${col}` }, { status: 400 });
      }
      marcaCampos.push(col);
      marcaValores.push(v);
    }

    // INSERT/UPDATE base (foto, nombre, teléfono, logo) + cualquier campo de marca.
    const cols = ["foto", "nombre_bienvenida", "telefono", "logo", ...marcaCampos];
    const provistos = [fotoProvista, nombreProvisto, telefonoProvisto, logoProvisto, ...marcaCampos.map(() => true)];
    const valores = [foto, nombreBienvenida, telefono, logo, ...marcaValores];
    const ins = cols.map((_, i) => `$${i + 1}`).join(", ");
    const upd = cols.map((c, i) => `${c} = CASE WHEN $${cols.length + i + 1} THEN $${i + 1} ELSE perfil_dentista.${c} END`).join(", ");
    await query(
      `INSERT INTO perfil_dentista (id, ${cols.join(", ")}, actualizado_en)
       VALUES (1, ${ins}, now())
       ON CONFLICT (id) DO UPDATE SET ${upd}, actualizado_en = now()`,
      [...valores, ...provistos]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
