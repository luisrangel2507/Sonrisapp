// Constantes compartidas del odontograma — notación FDI (32 dientes permanentes).

export const ARCO_SUPERIOR = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const ARCO_INFERIOR = [38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48];
export const NUMEROS_FDI = [...ARCO_SUPERIOR, ...ARCO_INFERIOR];

export type EstadoDiente = "sano" | "observacion" | "caries" | "fractura" | "tratado" | "extraido";

export const ESTADO_DIENTE: Record<EstadoDiente, { ring: string; glow: string; label: string }> = {
  sano: { ring: "#5DC9E8", glow: "93,201,232", label: "Sano" },
  observacion: { ring: "#F0C24E", glow: "240,194,78", label: "Observación" },
  caries: { ring: "#E8508C", glow: "232,80,140", label: "Caries" },
  fractura: { ring: "#F2703D", glow: "242,112,61", label: "Fractura" },
  tratado: { ring: "#5FE0A0", glow: "95,224,160", label: "Tratado" },
  extraido: { ring: "#7A7A88", glow: "122,122,136", label: "Extraído" },
};

// FDI ⇄ Universal (1-32) — el doctor puede alternar el sistema de numeración.
export const FDI_A_UNIVERSAL: Record<number, number> = {
  18: 1, 17: 2, 16: 3, 15: 4, 14: 5, 13: 6, 12: 7, 11: 8,
  21: 9, 22: 10, 23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
  38: 17, 37: 18, 36: 19, 35: 20, 34: 21, 33: 22, 32: 23, 31: 24,
  41: 25, 42: 26, 43: 27, 44: 28, 45: 29, 46: 30, 47: 31, 48: 32,
};

export interface HistorialEntrada {
  fecha: string;
  tipo: string;
  nota: string | null;
}

export interface HistorialDiente {
  estado: EstadoDiente;
  entradas: HistorialEntrada[];
}

export type HistorialDental = Record<number, HistorialDiente>;
