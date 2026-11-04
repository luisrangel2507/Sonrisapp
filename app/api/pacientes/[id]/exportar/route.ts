import { NextRequest, NextResponse } from "next/server";
import { errorJson } from "@/lib/api-error";
import { identidadDesdeRequest } from "@/lib/auth";
import { registrarCambio } from "@/lib/bitacora";
import { obtenerMarca } from "@/lib/marca";
import { GET as getPaciente } from "../route";
import { GET as getHistoria } from "../historia-clinica/route";
import { GET as getNotas } from "../notas/route";
import { GET as getDientes } from "../dientes/route";
import { GET as getConsentimientos } from "../consentimientos/route";
import { GET as getPresupuestos } from "../presupuestos/route";
import { GET as getRecetas } from "../recetas/route";
import { GET as getSolicitudes } from "../solicitudes/route";
import { GET as getFotos } from "../fotos/route";
import { GET as getBitacora } from "../bitacora/route";
import { GET as getCitas } from "../../../citas/route";
import { GET as getPagos } from "../../../pagos/route";

export const dynamic = "force-dynamic";

type Handler = (req: NextRequest, props: { params: Promise<{ id: string }> }) => Promise<Response>;

// NOM-024 (portabilidad e intercambio): todo el expediente del paciente en
// un solo archivo estructurado (JSON), con las mismas reglas de acceso y
// descifrado que la app. Solo administradores; queda en la bitácora.
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const pacienteId = Number(id);
    if (!Number.isInteger(pacienteId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
    const identidad = await identidadDesdeRequest(req);
    if (identidad.rol !== "admin") {
      return NextResponse.json({ error: "solo un administrador puede exportar el expediente" }, { status: 403 });
    }

    const conParams = { params: Promise.resolve({ id }) };
    const leer = async (h: Handler, r: NextRequest = req) => {
      const res = await h(r, conParams);
      return res.ok ? res.json() : null;
    };
    const conFiltro = (ruta: string) => new NextRequest(new URL(`${ruta}?paciente_id=${pacienteId}`, req.url), { headers: req.headers });

    const [paciente, historia, notas, dientes, consentimientos, presupuestos, recetas, solicitudes, fotos, bitacora, citas, pagos] =
      await Promise.all([
        leer(getPaciente),
        leer(getHistoria),
        leer(getNotas),
        leer(getDientes),
        leer(getConsentimientos),
        leer(getPresupuestos),
        leer(getRecetas),
        leer(getSolicitudes),
        leer(getFotos),
        leer(getBitacora),
        leer(getCitas as unknown as Handler, conFiltro("/api/citas")),
        leer(getPagos as unknown as Handler, conFiltro("/api/pagos")),
      ]);
    if (!paciente?.paciente) return NextResponse.json({ error: "paciente no encontrado" }, { status: 404 });

    const marca = await obtenerMarca();
    const expediente = {
      formato: "sonrisapp-expediente",
      version: 1,
      generado_en: new Date().toISOString(),
      generado_por: identidad.nombre,
      establecimiento: { nombre: marca.clinicaNombre, responsable: marca.doctorNombre, cedula: marca.cedula, direccion: marca.direccion },
      catalogos: { diagnosticos: "CIE-10 (OMS)", dientes: "Notación FDI / ISO 3950", identificacion: "CURP (RENAPO)" },
      paciente: paciente.paciente,
      historia_clinica: historia?.historiaClinica ?? historia?.historia_clinica ?? historia ?? null,
      notas_clinicas: notas?.notas ?? [],
      odontograma: dientes?.historial ?? dientes ?? null,
      consentimientos: consentimientos?.consentimientos ?? [],
      presupuestos: presupuestos?.presupuestos ?? [],
      recetas: recetas?.recetas ?? [],
      citas: citas?.citas ?? [],
      pagos: pagos?.pagos ?? [],
      solicitudes: solicitudes?.solicitudes ?? [],
      // Las imágenes se descargan aparte; aquí solo sus datos.
      fotos: (fotos?.fotos ?? []).map((f: Record<string, unknown>) => ({ ...f, miniatura: undefined })),
      bitacora: bitacora?.accesos ?? [],
    };

    await registrarCambio(pacienteId, "exportacion", identidad.nombre, "Expediente exportado (JSON)");
    const nombreArchivo = `expediente-${String(paciente.paciente.folio ?? pacienteId)}.json`;
    return new NextResponse(JSON.stringify(expediente, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
