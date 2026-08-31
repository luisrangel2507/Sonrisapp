import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { esFechaFutura } from "@/lib/fechas";
import { guardarHistoriaClinica, obtenerHistoriaClinicaVigente } from "@/lib/historia-clinica";
import { cifrar, descifrar } from "@/lib/crypto";

// alergias_cual y antecedentes_medicos_cual son texto libre clínico —
// se cifran en reposo (NOM-024) igual que la historia clínica.
const PACIENTE_CAMPOS_CIFRABLES = new Set(["alergias_cual", "antecedentes_medicos_cual"]);

// Quién queda registrado en creado_por_nombre cuando el paciente llena
// su propia historia clínica desde este link público (sin sesión de
// consultorio) — distinto del genérico "Equipo del consultorio" que
// usan las rutas internas, para no mezclar auto-reporte del paciente
// con acciones del personal en la auditoría.
const IDENTIDAD_FORMULARIO_PUBLICO = { usuarioId: null, nombre: "Paciente (formulario en línea)" };

// Ruta pública (fuera del middleware de sesión): el paciente entra
// con el link que le comparte la clínica y llena su propia historia
// clínica sin necesitar cuenta.
export const dynamic = "force-dynamic";

interface PacientePublico {
  id: number;
  nombre: string;
  fecha_nacimiento: string | null;
  telefono: string | null;
  email: string | null;
  alergias: boolean | null;
  alergias_cual: string | null;
  antecedentes_medicos: boolean | null;
  antecedentes_medicos_cual: string | null;
}

export async function GET(_req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const { rows: pacienteRows } = await query<PacientePublico>(
      `SELECT id, nombre, fecha_nacimiento, telefono, email,
              alergias, alergias_cual, antecedentes_medicos, antecedentes_medicos_cual
       FROM pacientes WHERE historial_token = $1`,
      [params.token]
    );

    if (pacienteRows.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }

    const paciente = {
      ...pacienteRows[0],
      alergias_cual: descifrar(pacienteRows[0].alergias_cual),
      antecedentes_medicos_cual: descifrar(pacienteRows[0].antecedentes_medicos_cual),
    };
    const historiaClinica = await obtenerHistoriaClinicaVigente(paciente.id);

    return NextResponse.json({ paciente, historiaClinica });
  } catch (err) {
    return errorJson(err);
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const { rows: pacienteRows } = await query<{ id: number }>(
      `SELECT id FROM pacientes WHERE historial_token = $1`,
      [params.token]
    );

    if (pacienteRows.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }

    const pacienteId = pacienteRows[0].id;
    const body = await req.json().catch(() => ({}));

    const pacienteCampos: string[] = [];
    const pacienteValores: unknown[] = [];
    if (typeof body.fecha_nacimiento === "string" && body.fecha_nacimiento && !esFechaFutura(body.fecha_nacimiento)) {
      pacienteCampos.push("fecha_nacimiento");
      pacienteValores.push(body.fecha_nacimiento);
    }
    for (const campo of [
      "telefono",
      "email",
      "alergias",
      "alergias_cual",
      "antecedentes_medicos",
      "antecedentes_medicos_cual",
    ] as const) {
      if (campo in body) {
        pacienteCampos.push(campo);
        const valor = body[campo] ?? null;
        pacienteValores.push(PACIENTE_CAMPOS_CIFRABLES.has(campo) ? cifrar(valor) : valor);
      }
    }
    if (pacienteCampos.length > 0) {
      const asignaciones = pacienteCampos.map((campo, i) => `${campo} = $${i + 2}`).join(", ");
      await query(`UPDATE pacientes SET ${asignaciones} WHERE id = $1`, [pacienteId, ...pacienteValores]);
    }

    const historiaClinica = await guardarHistoriaClinica(pacienteId, body, IDENTIDAD_FORMULARIO_PUBLICO, {
      esPublico: true,
    });

    return NextResponse.json({ historiaClinica });
  } catch (err) {
    return errorJson(err);
  }
}
