// Interpreta un dictado clínico en español ("caries en el 16 y 26, el 36
// necesita endodoncia") y lo convierte en filas diente → estado. Todo corre
// en el navegador: el texto del paciente no sale a ningún servicio externo.
import { NUMEROS_FDI } from "@/lib/dental";

export interface FilaDictado {
  diente: number;
  estado: string | null; // null = no se entendió el padecimiento
  tipo: string;
  fragmento: string;
}

const quitarAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// [regex, estado, etiqueta]; el orden importa (lo más específico primero).
const REGLAS: [RegExp, string, string][] = [
  [/caries recurrente|restauracion en mal estado|resina en mal estado|filtrada/, "caries_recurrente", "Caries recurrente"],
  [/caries|cariado|cariada/, "caries", "Caries"],
  [/extraccion indicada|para extraer|hay que extraer|extraer|extraccion|por extraer|exodoncia indicada/, "extraccion_indicada", "Extracción indicada"],
  [/extraido|extraida|ya se extrajo|se extrajo/, "extraido", "Diente extraído"],
  [/ausente|le falta|falta el|no tiene|perdido|perdida/, "ausente", "Diente ausente"],
  [/endodoncia.*(mal|filtra|fracas|necesita|requiere|indicada)|(mal|necesita|requiere|necesitan).*(endodoncia|conducto)|tratamiento de conducto|necesita conducto/, "endodoncia_mal", "Endodoncia en mal estado / requerida"],
  [/endodoncia|conducto/, "endodoncia_buena", "Endodoncia en buen estado"],
  [/(necesita|requiere|para|indicada).*corona|corona.*(necesita|requiere|indicada)/, "para_corona", "Diente para corona"],
  [/corona.*(mal|rota|floja|desajust)|(mal|rota).*corona/, "corona_mala", "Corona en mal estado"],
  [/corona/, "corona_buena", "Corona en buen estado"],
  [/sellante.*(mal|perdido|desgastado)|(mal|perdido).*sellante/, "sellante_mal", "Sellante en mal estado"],
  [/sellante/, "sellante_bueno", "Sellante en buen estado"],
  [/implante.*(mal|fracas|flojo)|(mal|flojo).*implante/, "implante_malo", "Implante en mal estado"],
  [/implante/, "implante_bueno", "Implante en buen estado"],
  [/incrustacion.*(mal|rota)|(mal|rota).*incrustacion/, "incrustacion_mala", "Incrustación en mal estado"],
  [/incrustacion/, "incrustacion_buena", "Incrustación en buen estado"],
  [/amalgama/, "superficie_amalgama", "Amalgama"],
  [/resina|restauracion|obturacion|empaste/, "restauracion_buena", "Restauración en buen estado"],
  [/temporal|provisional/, "material_temporal", "Material temporal"],
];

const FDI = new Set(NUMEROS_FDI);

export function interpretarDictado(texto: string): FilaDictado[] {
  const limpio = quitarAcentos(texto).replace(/(\d)\s+(\d)(?!\d)/g, "$1$2");
  const clausulas = limpio.split(/[.;\n]|,|\b(?:ademas|tambien|luego|despues|y el diente|y en el)\b/).map((c) => c.trim()).filter(Boolean);
  const filas: FilaDictado[] = [];
  const vistos = new Set<string>();
  let ultimaCondicion: [string, string] | null = null;
  for (const c of clausulas) {
    const dientes = (c.match(/\b[1-4][1-8]\b/g) ?? []).map(Number).filter((n) => FDI.has(n));
    const regla = REGLAS.find(([re]) => re.test(c));
    if (regla) ultimaCondicion = [regla[1], regla[2]];
    if (dientes.length === 0) continue;
    for (const d of new Set(dientes)) {
      const clave = `${d}|${regla?.[1] ?? "?"}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      filas.push({
        diente: d,
        estado: regla ? regla[1] : null,
        tipo: regla ? regla[2] : "Sin identificar",
        fragmento: c,
      });
    }
  }
  void ultimaCondicion;
  return filas;
}
