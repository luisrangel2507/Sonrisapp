import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { HistorialDental, EstadoDiente } from "@/lib/dental";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    paciente_diente_id: number;
    fecha: string;
    tipo: string;
    nota: string | null;
  }>(
    `SELECT h.paciente_diente_id, h.fecha, h.tipo, h.nota
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
      fecha: e.fecha,
      tipo: e.tipo,
      nota: e.nota,
    });
  }

  return NextResponse.json({ historial });
}
