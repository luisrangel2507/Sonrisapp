import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "@/lib/db";

export async function aplicarSchema() {
  try {
    const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
    await query(sql);
    console.log("[schema] db/schema.sql aplicado correctamente.");
  } catch (err) {
    console.error("[schema] no se pudo aplicar db/schema.sql al arrancar:", err);
  }
}
