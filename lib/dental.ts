// Constantes compartidas del odontograma — notación FDI (32 dientes permanentes).

export const ARCO_SUPERIOR = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const ARCO_INFERIOR = [38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48];
export const NUMEROS_FDI = [...ARCO_SUPERIOR, ...ARCO_INFERIOR];

// Catálogo de afectaciones que puede tener un diente — reemplaza al set
// genérico anterior (sano/observación/caries/fractura/tratado/extraído)
// por las 14 condiciones específicas por diente del cartel de la
// doctora. "sano" se conserva como estado base (ningún diente marcado):
// no es una afectación, es la ausencia de una. Mal aliento, bruxismo y
// sarro quedaron fuera a propósito — son condiciones de toda la boca,
// no de un diente en particular, así que solo se documentan como nota
// en el historial y no aparecen aquí ni se pueden "marcar" en un diente.
export type EstadoDiente =
  | "sano"
  | "caries"
  | "sensibilidad"
  | "periodontal"
  | "erosion"
  | "abrasion"
  | "endodoncia"
  | "pulpitis"
  | "necrosis"
  | "fractura"
  | "movilidad"
  | "anquilosis"
  | "protesis"
  | "implante"
  | "ausente";

export const ESTADO_DIENTE: Record<EstadoDiente, { ring: string; glow: string; label: string }> = {
  sano: { ring: "#5DC9E8", glow: "93,201,232", label: "Sano" },
  caries: { ring: "#E8508C", glow: "232,80,140", label: "Caries" },
  sensibilidad: { ring: "#6FD8F2", glow: "111,216,242", label: "Sensibilidad" },
  periodontal: { ring: "#E85050", glow: "232,80,80", label: "Enf. periodontal" },
  erosion: { ring: "#D4A24C", glow: "212,162,76", label: "Erosión" },
  abrasion: { ring: "#C2703D", glow: "194,112,61", label: "Abrasión" },
  endodoncia: { ring: "#5FE0A0", glow: "95,224,160", label: "Endodoncia" },
  pulpitis: { ring: "#B33951", glow: "179,57,81", label: "Pulpitis irreversible" },
  necrosis: { ring: "#5C4C66", glow: "92,76,102", label: "Necrosis pulpar" },
  fractura: { ring: "#F2703D", glow: "242,112,61", label: "Fractura" },
  movilidad: { ring: "#F0C24E", glow: "240,194,78", label: "Movilidad" },
  anquilosis: { ring: "#8B6B4A", glow: "139,107,74", label: "Anquilosis" },
  protesis: { ring: "#9B9BC7", glow: "155,155,199", label: "Prótesis" },
  implante: { ring: "#7C5CE0", glow: "124,92,224", label: "Implante" },
  ausente: { ring: "#6B6575", glow: "107,101,117", label: "Ausente" },
};

// FDI ⇄ Universal (1-32) — el doctor puede alternar el sistema de numeración.
export const FDI_A_UNIVERSAL: Record<number, number> = {
  18: 1, 17: 2, 16: 3, 15: 4, 14: 5, 13: 6, 12: 7, 11: 8,
  21: 9, 22: 10, 23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
  38: 17, 37: 18, 36: 19, 35: 20, 34: 21, 33: 22, 32: 23, 31: 24,
  41: 25, 42: 26, 43: 27, 44: 28, 45: 29, 46: 30, 47: 31, 48: 32,
};

export interface HistorialEntrada {
  id: number;
  fecha: string;
  tipo: string;
  nota: string | null;
  creado_por_nombre: string | null;
  vigente: boolean;
  reemplaza_a: number | null;
  motivo_anulacion: string | null;
  anulado_por_nombre: string | null;
}

export interface HistorialDiente {
  estado: EstadoDiente;
  entradas: HistorialEntrada[];
}

export type HistorialDental = Record<number, HistorialDiente>;
