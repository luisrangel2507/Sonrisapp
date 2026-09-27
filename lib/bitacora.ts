import { query } from "@/lib/db";

export type TipoAcceso = "expediente" | "consentimiento" | "presupuesto" | "portal" | "formulario";

// Trazabilidad de LECTURA (NOM-024) — quién consultó el expediente de
// un paciente y cuándo, aparte del "quién lo modificó" que ya cubren
// las columnas creado_por_nombre/anulado_por_nombre de cada tabla.
// usuarioNombre null = fue el propio paciente entrando con su link
// público (consentimiento, presupuesto, portal, formulario).
//
// Best-effort: si falla, no debe tumbar la petición real que la
// disparó — mismo criterio que el aviso de WhatsApp al crear una receta.
export async function registrarAcceso(pacienteId: number, tipo: TipoAcceso, usuarioNombre: string | null) {
  try {
    await query(`INSERT INTO bitacora_accesos (paciente_id, tipo, usuario_nombre) VALUES ($1, $2, $3)`, [
      pacienteId,
      tipo,
      usuarioNombre,
    ]);
  } catch (err) {
    console.error("[bitacora] no se pudo registrar acceso:", err);
  }
}
