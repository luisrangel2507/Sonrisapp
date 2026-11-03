import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { limitarPublico } from "@/lib/limite-publico";
import { obtenerMarca } from "@/lib/marca";
import { enviarPush } from "@/lib/push";

export const dynamic = "force-dynamic";

interface FilaEncuesta {
  id: number;
  paciente_id: number;
  nombre: string;
  tratamiento: string | null;
  calificacion: number | null;
  respondido_en: string | null;
  creado_en: string;
}

async function buscar(token: string) {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return null;
  const { rows } = await query<FilaEncuesta>(
    `SELECT e.id, e.paciente_id, p.nombre, c.tratamiento, e.calificacion, e.respondido_en, e.creado_en
     FROM encuestas e JOIN pacientes p ON p.id = e.paciente_id LEFT JOIN citas c ON c.id = e.cita_id
     WHERE e.token = $1`,
    [token]
  );
  return rows[0] ?? null;
}

// Público: lo que necesita la página de la encuesta (solo el primer nombre).
export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const limitado = await limitarPublico(req, "lectura-publica", 300, 60);
  if (limitado) return limitado;
  try {
    const { token } = await props.params;
    const e = await buscar(token);
    if (!e) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
    const marca = await obtenerMarca();
    return NextResponse.json({
      clinica: marca.clinicaNombre,
      nombre: e.nombre.trim().split(/\s+/)[0],
      tratamiento: e.tratamiento,
      respondida: !!e.respondido_en,
      calificacion: e.calificacion,
      google: e.respondido_en && (e.calificacion ?? 0) >= 4 ? marca.googleResenasUrl : null,
    });
  } catch (err) {
    return errorJson(err);
  }
}

// Público: guarda la calificación una sola vez (caduca a los 30 días).
export async function POST(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const limitado = await limitarPublico(req, "encuesta", 10, 60, 20_000);
  if (limitado) return limitado;
  try {
    const { token } = await props.params;
    const e = await buscar(token);
    if (!e) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
    if (e.respondido_en) return NextResponse.json({ error: "Esta encuesta ya fue respondida. ¡Gracias!" }, { status: 409 });
    if (Date.now() - new Date(e.creado_en).getTime() > 30 * 86_400_000) {
      return NextResponse.json({ error: "Esta encuesta ya caducó." }, { status: 410 });
    }
    const body = await req.json().catch(() => ({}));
    const calificacion = Number(body?.calificacion);
    if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
      return NextResponse.json({ error: "Elige de 1 a 5 estrellas." }, { status: 400 });
    }
    const comentario =
      typeof body?.comentario === "string" && body.comentario.trim() ? body.comentario.trim().slice(0, 1000) : null;
    const { rowCount } = await query(
      `UPDATE encuestas SET calificacion = $2, comentario = $3, respondido_en = now()
       WHERE id = $1 AND respondido_en IS NULL`,
      [e.id, calificacion, comentario]
    );
    if (!rowCount) return NextResponse.json({ error: "Esta encuesta ya fue respondida. ¡Gracias!" }, { status: 409 });

    if (calificacion <= 3) {
      await enviarPush(
        `Calificación baja · ${"★".repeat(calificacion)}`,
        `${e.nombre.trim()}${comentario ? `: ${comentario.slice(0, 120)}` : " (sin comentario)"}`,
        `/dashboard/pacientes/${e.paciente_id}`
      ).catch(() => {});
    }
    const marca = await obtenerMarca();
    return NextResponse.json({ ok: true, google: calificacion >= 4 ? marca.googleResenasUrl : null });
  } catch (err) {
    return errorJson(err);
  }
}
