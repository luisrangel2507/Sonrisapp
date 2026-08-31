import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";
import { cifrar, descifrar } from "@/lib/crypto";
import { asegurarHistorialToken } from "@/lib/historial-token";
import { enviarWhatsApp, mensajeRecetaNueva } from "@/lib/whatsapp";
import { obtenerRpIdYOrigin } from "@/lib/webauthn-origin";

const CAMPOS_CIFRABLES = ["diagnostico", "medicamentos", "indicaciones"] as const;

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows } = await query(
      `SELECT id, fecha, diagnostico, medicamentos, indicaciones,
              creado_por_nombre, creado_en, vigente, motivo_anulacion, anulado_por_nombre
       FROM recetas
       WHERE paciente_id = $1 ORDER BY creado_en DESC`,
      [pacienteId]
    );

    const recetas = rows.map((fila) => {
      const copia = { ...fila };
      for (const campo of CAMPOS_CIFRABLES) copia[campo] = descifrar(copia[campo]);
      return copia;
    });

    return NextResponse.json({ recetas });
  } catch (err) {
    return errorJson(err);
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { diagnostico, medicamentos, indicaciones } = body ?? {};

    if (!medicamentos || typeof medicamentos !== "string" || !medicamentos.trim()) {
      return NextResponse.json({ error: "medicamentos es requerido" }, { status: 400 });
    }

    const identidad = await identidadDesdeRequest(req);

    const { rows } = await query(
      `INSERT INTO recetas (paciente_id, diagnostico, medicamentos, indicaciones, creado_por, creado_por_nombre)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, fecha, diagnostico, medicamentos, indicaciones, creado_por_nombre, creado_en, vigente`,
      [
        pacienteId,
        cifrar(diagnostico ?? null),
        cifrar(medicamentos),
        cifrar(indicaciones ?? null),
        identidad.usuarioId,
        identidad.nombre,
      ]
    );

    const receta = { ...rows[0] };
    for (const campo of CAMPOS_CIFRABLES) receta[campo] = descifrar(receta[campo]);

    // Aviso por WhatsApp al paciente con el link a su portal, donde ya
    // puede ver la receta — best-effort: si no tiene teléfono o el
    // WhatsApp Business no está configurado, enviarWhatsApp no hace
    // nada (no debe tumbar la creación de la receta).
    try {
      const { rows: pacienteRows } = await query<{ nombre: string; telefono: string | null }>(
        `SELECT nombre, telefono FROM pacientes WHERE id = $1`,
        [pacienteId]
      );
      const paciente = pacienteRows[0];
      if (paciente?.telefono) {
        const token = await asegurarHistorialToken(pacienteId);
        const { origin } = obtenerRpIdYOrigin(req);
        const url = `${origin}/portal/${token}`;
        await enviarWhatsApp(paciente.telefono, mensajeRecetaNueva(paciente.nombre, url));
      }
    } catch (err) {
      console.error("[recetas] no se pudo avisar por WhatsApp:", err);
    }

    return NextResponse.json({ receta }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
