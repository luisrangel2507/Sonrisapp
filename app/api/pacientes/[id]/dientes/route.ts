import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { HistorialDental, EstadoDiente } from "@/lib/dental";
import { errorJson } from "@/lib/api-error";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pacienteId = Number(params.id);
    if (!Number.isInteger(pacienteId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows: dientes } = await query<{
      id: number;
      numero_fdi: number;
      estado: EstadoDiente;
    }>(
      `SELECT id, numero_fdi, estado FROM paciente_dientes WHERE paciente_id = $1`,
      [pacienteId]
    );

    const { rows: entradas } = await query<{
      id: number;
      paciente_diente_id: number;
      fecha: string;
      tipo: string;
      nota: string | null;
      creado_por_nombre: string | null;
      vigente: boolean;
      reemplaza_a: number | null;
      motivo_anulacion: string | null;
      anulado_por_nombre: string | null;
    }>(
      `SELECT h.id, h.paciente_diente_id, h.fecha, h.tipo, h.nota,
              h.creado_por_nombre, h.vigente, h.reemplaza_a,
              h.motivo_anulacion, h.anulado_por_nombre
       FROM diente_historial h
       JOIN paciente_dientes d ON d.id = h.paciente_diente_id
       WHERE d.paciente_id = $1
       ORDER BY h.fecha DESC, h.id DESC`,
      [pacienteId]
    );

    const historial: HistorialDental = {};
    for (const d of dientes) {
      historial[d.numero_fdi] = { estado: d.estado, entradas: [] };
    }
    for (const e of entradas) {
      const diente = dientes.find((d) => d.id === e.paciente_diente_id);
      if (!diente) continue;
      historial[diente.numero_fdi].entradas.push({
        id: e.id,
        fecha: e.fecha,
        tipo: e.tipo,
        nota: e.nota,
        creado_por_nombre: e.creado_por_nombre,
        vigente: e.vigente,
        reemplaza_a: e.reemplaza_a,
        motivo_anulacion: e.motivo_anulacion,
        anulado_por_nombre: e.anulado_por_nombre,
      });
    }

    return NextResponse.json({ historial });
  } catch (err) {
    return errorJson(err);
  }
}
