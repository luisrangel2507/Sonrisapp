import { query } from "@/lib/db";

export async function versionTv(): Promise<number> {
  const { rows } = await query<{ tv_version: number }>(`SELECT tv_version FROM pantalla_tv WHERE id = 1`);
  return rows[0]?.tv_version ?? 1;
}
