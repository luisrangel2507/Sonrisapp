import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashContrasena } from "@/lib/auth";
import { errorJson } from "@/lib/api-error";

export async function GET() {
  try {
    const { rows } = await query(
      `SELECT id, nombre, usuario, creado_en FROM usuarios ORDER BY creado_en ASC`
    );
    return NextResponse.json({ usuarios: rows });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
    const usuario = typeof body?.usuario === "string" ? body.usuario.trim() : "";
    const contrasena = typeof body?.contrasena === "string" ? body.contrasena : "";

    if (!nombre || !usuario || !contrasena) {
      return NextResponse.json({ error: "nombre, usuario y contraseña son requeridos" }, { status: 400 });
    }
    if (contrasena.length < 6) {
      return NextResponse.json({ error: "la contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const contrasenaHash = await hashContrasena(contrasena);

    const { rows } = await query(
      `INSERT INTO usuarios (nombre, usuario, contrasena_hash) VALUES ($1, $2, $3)
       RETURNING id, nombre, usuario, creado_en`,
      [nombre, usuario, contrasenaHash]
    );

    return NextResponse.json({ usuario: rows[0] }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && /unique/i.test(err.message)) {
      return NextResponse.json({ error: "ese nombre de usuario ya existe" }, { status: 409 });
    }
    return errorJson(err);
  }
}
