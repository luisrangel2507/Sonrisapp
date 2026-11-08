import { query } from "@/lib/db";
import { descifrar } from "@/lib/crypto";

// Firma de la doctora (PNG en data URL, cifrada), dibujada en Perfil.
export async function obtenerFirmaDoctora(): Promise<string | null> {
  try {
    const { rows } = await query<{ firma_doctora: string | null }>(`SELECT firma_doctora FROM perfil_dentista WHERE id = 1`);
    return descifrar(rows[0]?.firma_doctora ?? null);
  } catch {
    return null;
  }
}
