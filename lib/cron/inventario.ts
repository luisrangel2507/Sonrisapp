import { query } from "@/lib/db";
import { enviarPush } from "@/lib/push";

// Una vez al día: aviso push si hay insumos en o por debajo de su mínimo.
export async function avisarStockBajo() {
  const { rows } = await query<{ nombre: string }>(
    `SELECT nombre FROM inventario
     WHERE cantidad_minima IS NOT NULL AND cantidad <= cantidad_minima
     ORDER BY nombre`
  );
  if (rows.length === 0) return { stockBajo: 0 };
  const { rowCount } = await query(
    `INSERT INTO avisos_sistema (clave, fecha)
     VALUES ('stock_bajo', (now() AT TIME ZONE 'America/Mexico_City')::date)
     ON CONFLICT DO NOTHING`
  );
  if (rowCount) {
    const nombres = rows.slice(0, 5).map((r) => r.nombre).join(", ");
    const resto = rows.length > 5 ? ` y ${rows.length - 5} más` : "";
    await enviarPush(
      `Inventario: ${rows.length} insumo${rows.length === 1 ? "" : "s"} por surtir`,
      `${nombres}${resto}`,
      "/dashboard/inventario"
    );
  }
  return { stockBajo: rows.length };
}
