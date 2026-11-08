import { camposHuellaConsentimiento, huella } from "@/lib/integridad";
import { registrarCambio } from "@/lib/bitacora";
import { NextRequest, NextResponse } from "next/server";
import { limitarPublico } from "@/lib/limite-publico";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";
import { cifrar, descifrar } from "@/lib/crypto";
import { registrarAcceso } from "@/lib/bitacora";
import { obtenerFirmaDoctora } from "@/lib/firma-doctora";
import { obtenerMarca } from "@/lib/marca";

// Ruta pública (fuera del middleware de sesión): el paciente entra con
// el link que le comparte la clínica y firma sin necesitar cuenta.
export const dynamic = "force-dynamic";

const FIRMA_MAX_BYTES = 500_000;

// contenido y firma (dato biométrico) se guardan cifrados (NOM-024) —
// ver app/api/pacientes/[id]/consentimientos/route.ts.
const CAMPOS_CIFRABLES = ["contenido", "firma", "informante_firma", "testigo1_firma", "testigo2_firma"] as const;

export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const limitado = await limitarPublico(req, "lectura-publica", 300, 60);
  if (limitado) return limitado;
  const params = await props.params;
  try {
    const { rows } = await query<{
      id: number;
      paciente_id: number;
      titulo: string;
      contenido: string;
      estado: string;
      firma: string | null;
      nombre_firma: string | null;
      firmado_en: string | null;
      paciente_nombre: string;
      expira_en: string | null;
      informante_nombre: string | null;
      informante_firma: string | null;
      testigo1_nombre: string | null;
      testigo1_firma: string | null;
      testigo2_nombre: string | null;
      testigo2_firma: string | null;
    }>(
      `SELECT c.id, c.paciente_id, c.titulo, c.contenido, c.estado, c.firma, c.nombre_firma, c.firmado_en, c.expira_en,
              c.informante_nombre, c.informante_firma, c.testigo1_nombre, c.testigo1_firma, c.testigo2_nombre, c.testigo2_firma,
              p.nombre AS paciente_nombre
       FROM consentimientos c
       JOIN pacientes p ON p.id = c.paciente_id
       WHERE c.token = $1`,
      [params.token]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }

    // Un consentimiento ya firmado nunca expira (es el registro de lo
    // acordado, y la doctora reutiliza este mismo link para "Ver" desde
    // el panel) — solo importa la expiración mientras sigue pendiente.
    const { expira_en, paciente_id, ...resto } = rows[0];
    if (resto.estado === "pendiente" && expira_en && new Date(expira_en) < new Date()) {
      return NextResponse.json({ error: "expirado" }, { status: 410 });
    }

    const consentimiento: Record<string, unknown> = { ...resto };
    for (const campo of CAMPOS_CIFRABLES) consentimiento[campo] = descifrar(consentimiento[campo] as string | null);

    if (!consentimiento.informante_nombre) {
      consentimiento.informante_nombre = (await obtenerMarca()).doctorNombre;
      consentimiento.informante_firma = await obtenerFirmaDoctora();
    }
    void registrarAcceso(paciente_id, "consentimiento", null);

    return NextResponse.json({ consentimiento });
  } catch (err) {
    return errorJson(err);
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const limitado = await limitarPublico(req, "consentimiento", 10, 60, 800_000);
  if (limitado) return limitado;
  const params = await props.params;
  try {
    const body = await req.json().catch(() => ({}));
    const { nombre_firma, firma } = body ?? {};
    // Testigos (NOM-004 10.1.1): hasta dos, cada uno con nombre y firma.
    const testigos: { nombre: string; firma: string }[] = [];
    for (const t of Array.isArray(body?.testigos) ? body.testigos.slice(0, 2) : []) {
      const nombre = typeof t?.nombre === "string" ? t.nombre.trim().slice(0, 160) : "";
      const f = typeof t?.firma === "string" ? t.firma : "";
      if (!nombre && !f) continue;
      if (!nombre || !f.startsWith("data:image/") || f.length > FIRMA_MAX_BYTES) {
        return NextResponse.json({ error: "cada testigo necesita nombre y firma" }, { status: 400 });
      }
      testigos.push({ nombre, firma: f });
    }

    if (typeof firma !== "string" || !firma.startsWith("data:image/") || firma.length > 700_000) {
      return NextResponse.json({ error: "firma inválida" }, { status: 400 });
    }
    if (!nombre_firma || typeof nombre_firma !== "string") {
      return NextResponse.json({ error: "nombre_firma es requerido" }, { status: 400 });
    }
    if (!firma || typeof firma !== "string" || !firma.startsWith("data:image/")) {
      return NextResponse.json({ error: "firma inválida" }, { status: 400 });
    }
    if (firma.length > FIRMA_MAX_BYTES) {
      return NextResponse.json({ error: "la firma es demasiado grande" }, { status: 400 });
    }

    const { rows: existentes } = await query<{ id: number; estado: string; expira_en: string | null }>(
      `SELECT id, estado, expira_en FROM consentimientos WHERE token = $1`,
      [params.token]
    );
    if (existentes.length === 0) {
      return NextResponse.json({ error: "link inválido" }, { status: 404 });
    }
    if (existentes[0].estado === "firmado") {
      return NextResponse.json({ error: "este consentimiento ya fue firmado" }, { status: 409 });
    }
    if (existentes[0].expira_en && new Date(existentes[0].expira_en) < new Date()) {
      return NextResponse.json({ error: "expirado" }, { status: 410 });
    }

    const { rows } = await query(
      `UPDATE consentimientos
       SET estado = 'firmado', firma = $2, nombre_firma = $3, firmado_en = now(),
           informante_nombre = $4, informante_firma = $5,
           testigo1_nombre = $6, testigo1_firma = $7, testigo2_nombre = $8, testigo2_firma = $9
       WHERE token = $1
       RETURNING id, paciente_id, titulo, contenido, estado, firma, nombre_firma, firmado_en,
                 informante_nombre, informante_firma, testigo1_nombre, testigo1_firma, testigo2_nombre, testigo2_firma`,
      [
        params.token,
        cifrar(firma),
        nombre_firma,
        (await obtenerMarca()).doctorNombre,
        cifrar(await obtenerFirmaDoctora()),
        testigos[0]?.nombre ?? null,
        testigos[0] ? cifrar(testigos[0].firma) : null,
        testigos[1]?.nombre ?? null,
        testigos[1] ? cifrar(testigos[1].firma) : null,
      ]
    );

    const consentimiento = { ...rows[0] };
    for (const campo of CAMPOS_CIFRABLES) consentimiento[campo] = descifrar(consentimiento[campo]);
    await query(`UPDATE consentimientos SET huella = $1 WHERE id = $2`, [
      huella(camposHuellaConsentimiento(consentimiento)),
      consentimiento.id,
    ]);
    await registrarCambio(consentimiento.paciente_id, "consentimiento", null, `Consentimiento firmado por ${String(nombre_firma).slice(0, 80)}`);
    delete consentimiento.paciente_id;

    return NextResponse.json({ consentimiento });
  } catch (err) {
    return errorJson(err);
  }
}
