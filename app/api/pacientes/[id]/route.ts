import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { PACIENTE_COLUMNAS } from "@/lib/paciente-columns";
import { errorJson } from "@/lib/api-error";
import { registrarCambio } from "@/lib/bitacora";
import { esFechaFutura } from "@/lib/fechas";
import { cifrar, descifrar } from "@/lib/crypto";
import { identidadDesdeRequest } from "@/lib/auth";
import { registrarAcceso } from "@/lib/bitacora";

// Texto libre clínico de la ficha rápida del paciente — se cifra en
// reposo (NOM-024) igual que la historia clínica y el formulario público.
const CAMPOS_CIFRABLES = new Set(["alergias_cual", "medicamentos", "antecedentes_medicos_cual"]);

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { rows } = await query(
      `SELECT ${PACIENTE_COLUMNAS} FROM pacientes WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }

    const paciente = { ...rows[0] };
    for (const campo of Array.from(CAMPOS_CIFRABLES)) {
      if (campo in paciente) paciente[campo] = descifrar(paciente[campo]);
    }

    const identidad = await identidadDesdeRequest(req);
    void registrarAcceso(id, "expediente", identidad.nombre);

    return NextResponse.json({ paciente });
  } catch (err) {
    return errorJson(err);
  }
}

// "Eliminar" un paciente no borra su expediente (NOM-024: el registro
// clínico nunca se pierde) — solo lo da de baja (activo=false) con un
// motivo y quién lo hizo. Un DELETE real destruiría en cascada todo su
// historial, incluidas las versiones vigente=false guardadas para
// auditoría. Solo un admin puede dar de baja a un paciente.
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const identidad = await identidadDesdeRequest(req);
    if (identidad.rol !== "admin") {
      return NextResponse.json({ error: "solo un administrador puede dar de baja a un paciente" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";
    if (!motivo) {
      return NextResponse.json({ error: "motivo es requerido" }, { status: 400 });
    }

    const { rowCount } = await query(
      `UPDATE pacientes
       SET activo = false, motivo_baja = $1, dado_de_baja_por_nombre = $2, dado_de_baja_en = now()
       WHERE id = $3 AND activo = true`,
      [motivo, identidad.nombre, id]
    );
    if (rowCount === 0) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}

const CAMPOS_EDITABLES = [
  "nombre",
  "telefono",
  "email",
  "fecha_nacimiento",
  "alergias",
  "alergias_cual",
  "medicamentos",
  "antecedentes_medicos",
  "antecedentes_medicos_cual",
  "curp",
] as const;

const ETIQUETA_CAMPO: Record<string, string> = {
  nombre: "nombre",
  telefono: "teléfono",
  email: "correo",
  fecha_nacimiento: "fecha de nacimiento",
  alergias: "alergias",
  alergias_cual: "alergias",
  medicamentos: "medicamentos",
  antecedentes_medicos: "antecedentes",
  antecedentes_medicos_cual: "antecedentes",
  curp: "CURP",
};

// Formato oficial de la CURP (RENAPO): 4 letras, fecha AAMMDD, sexo H/M/X,
// entidad (2 letras), 3 consonantes, homoclave y dígito verificador.
const CURP_RE = /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HMX](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const actualizaciones = CAMPOS_EDITABLES.filter((campo) => campo in (body ?? {}));

    if (actualizaciones.length === 0) {
      return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
    }
    if (body.fecha_nacimiento && esFechaFutura(body.fecha_nacimiento)) {
      return NextResponse.json({ error: "la fecha de nacimiento no puede ser futura" }, { status: 400 });
    }
    if ("curp" in body) {
      const c = typeof body.curp === "string" ? body.curp.trim().toUpperCase() : "";
      if (c && !CURP_RE.test(c)) {
        return NextResponse.json({ error: "La CURP no tiene un formato válido (18 caracteres)." }, { status: 400 });
      }
      body.curp = c || null;
    }

    // Qué campos cambian de verdad, para la bitácora (sin guardar valores).
    const { rows: antes } = await query<Record<string, unknown>>(
      `SELECT ${actualizaciones.join(", ")} FROM pacientes WHERE id = $1`,
      [id]
    );

    const asignaciones = actualizaciones.map((campo, i) => `${campo} = $${i + 2}`).join(", ");
    const valores = actualizaciones.map((campo) => {
      const valor = body[campo] ?? null;
      return CAMPOS_CIFRABLES.has(campo) ? cifrar(valor) : valor;
    });

    const { rows } = await query(
      `UPDATE pacientes SET ${asignaciones} WHERE id = $1 RETURNING ${PACIENTE_COLUMNAS}`,
      [id, ...valores]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });
    }

    const paciente = { ...rows[0] };
    for (const campo of Array.from(CAMPOS_CIFRABLES)) {
      if (campo in paciente) paciente[campo] = descifrar(paciente[campo]);
    }

    const previo = antes[0] ?? {};
    const norm = (v: unknown, campo: string) => {
      if (v == null || v === "") return null;
      const t = v instanceof Date ? v.toISOString() : String(v);
      return campo === "fecha_nacimiento" ? t.slice(0, 10) : t;
    };
    const cambiados = [
      ...new Set(
        actualizaciones
          .filter((c) => {
            const viejo = CAMPOS_CIFRABLES.has(c) ? descifrar(previo[c] as string | null) : previo[c];
            const nuevo = body[c] ?? null;
            return norm(viejo, c) !== norm(nuevo, c);
          })
          .map((c) => ETIQUETA_CAMPO[c] ?? c)
      ),
    ];
    if (cambiados.length > 0) {
      const identidad = await identidadDesdeRequest(req);
      await registrarCambio(id, "datos", identidad.nombre, `Datos editados: ${cambiados.join(", ")}`);
    }

    return NextResponse.json({ paciente });
  } catch (err) {
    return errorJson(err);
  }
}
