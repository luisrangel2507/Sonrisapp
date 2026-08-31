import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { DOCTORA, CLINICA, TARJETA_DENTISTA } from "@/lib/panel-data";

// Ruta pública (fuera del middleware de sesión): alimenta /tarjeta, la
// tarjeta de presentación digital que la doctora comparte con quien
// quiera — no expone nada más que lo que ya iría en una tarjeta física.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { rows } = await query<{ foto: string | null; telefono: string | null }>(
      `SELECT foto, telefono FROM perfil_dentista WHERE id = 1`
    );

    return NextResponse.json({
      nombre: DOCTORA.nombre,
      nombreCorto: TARJETA_DENTISTA.nombreCorto,
      titulo: TARJETA_DENTISTA.titulo,
      cedula: DOCTORA.cedula,
      especialidades: CLINICA.especialidades,
      direccion: CLINICA.direccion,
      horario: CLINICA.horario,
      sintomas: TARJETA_DENTISTA.sintomas,
      frase: TARJETA_DENTISTA.frase,
      llamadaAccion: TARJETA_DENTISTA.llamadaAccion,
      foto: rows[0]?.foto ?? null,
      telefono: rows[0]?.telefono ?? null,
    });
  } catch (err) {
    return errorJson(err);
  }
}
