import { NextRequest } from "next/server";
import { apiInterna, identidadLigera, irA } from "@/lib/ligera";

// Acciones de la agenda ligera. Se reenvían a la misma API que usa la app
// normal (con la cookie de quien la pidió), para que valgan exactamente
// las mismas reglas: puntos de lealtad, WhatsApp, permisos, bitácora.
export async function POST(req: NextRequest) {
  const identidad = await identidadLigera(req);
  if (!identidad) return irA(req, "/ligera");

  const form = await req.formData().catch(() => null);
  const accion = String(form?.get("accion") ?? "");
  const fecha = String(form?.get("fecha") ?? "");
  const volver = (aviso: string) =>
    irA(req, `/ligera/agenda?${/^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `fecha=${fecha}&` : ""}aviso=${encodeURIComponent(aviso)}`);

  const api = (ruta: string, metodo: string, cuerpo: unknown) => apiInterna(req, ruta, metodo, cuerpo);

  try {
    if (accion === "completar") {
      const r = await api("/api/citas", "PATCH", { id: Number(form?.get("id")), estado: "completada" });
      return volver(r.ok ? "Cita marcada como completada." : "Error: no se pudo completar la cita.");
    }
    if (accion === "pago") {
      const monto = Number(form?.get("monto"));
      if (!(monto > 0)) return volver("Error: escribe un monto mayor a 0.");
      const r = await api("/api/pagos", "POST", {
        cita_id: Number(form?.get("id")),
        paciente_id: Number(form?.get("paciente_id")),
        monto,
        metodo: String(form?.get("metodo") ?? "efectivo"),
      });
      return volver(r.ok ? "Pago registrado." : "Error: no se pudo registrar el pago.");
    }
    if (accion === "sala") {
      const r = await api("/api/tv", "POST", {
        modo: "bienvenida",
        nombre: String(form?.get("nombre") ?? ""),
        hora: String(form?.get("hora") ?? ""),
      });
      return volver(r.ok ? "Bienvenida enviada a la pantalla de la sala." : "Error: no se pudo mostrar en la sala.");
    }
    return volver("Error: acción no reconocida.");
  } catch {
    return volver("Error: no se pudo conectar. Intenta de nuevo.");
  }
}
