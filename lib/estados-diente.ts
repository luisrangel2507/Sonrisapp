import { query } from "@/lib/db";
import { ESTADO_DIENTE, type EstadoDientePersonalizado } from "@/lib/dental";

// Paleta para asignar color automáticamente a un estado nuevo — distinta
// a los rings ya usados por el catálogo fijo, para que no se confundan
// a simple vista. Se va rotando según cuántos personalizados existan ya.
const PALETA_PERSONALIZADA = [
  "#4E9F3D",
  "#3D8FB0",
  "#B15BAE",
  "#C4622D",
  "#6C6EA0",
  "#4FA37D",
  "#A0785B",
  "#D94F70",
  "#5B7DB1",
  "#8FA33D",
];

function normalizarClave(etiqueta: string) {
  return (
    etiqueta
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30) || "estado"
  );
}

export async function estadosPersonalizados(): Promise<EstadoDientePersonalizado[]> {
  const { rows } = await query<EstadoDientePersonalizado>(
    `SELECT clave, etiqueta, color FROM estados_diente_personalizados ORDER BY creado_en`
  );
  return rows;
}

export async function estadoDienteValido(estado: string): Promise<boolean> {
  if (estado in ESTADO_DIENTE) return true;
  const { rows } = await query(`SELECT 1 FROM estados_diente_personalizados WHERE clave = $1`, [estado]);
  return rows.length > 0;
}

export async function crearEstadoPersonalizado(etiqueta: string): Promise<EstadoDientePersonalizado> {
  const existentes = await estadosPersonalizados();
  const clavesUsadas = new Set([...Object.keys(ESTADO_DIENTE), ...existentes.map((e) => e.clave)]);

  const base = normalizarClave(etiqueta);
  let clave = base;
  let sufijo = 2;
  while (clavesUsadas.has(clave)) {
    clave = `${base}_${sufijo}`;
    sufijo++;
  }

  const color = PALETA_PERSONALIZADA[existentes.length % PALETA_PERSONALIZADA.length];

  const { rows } = await query<EstadoDientePersonalizado>(
    `INSERT INTO estados_diente_personalizados (clave, etiqueta, color) VALUES ($1, $2, $3)
     RETURNING clave, etiqueta, color`,
    [clave, etiqueta, color]
  );
  return rows[0];
}
