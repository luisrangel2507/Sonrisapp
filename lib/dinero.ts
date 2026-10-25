const formateador = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function formatearDinero(monto: number) {
  return formateador.format(monto);
}

// Importe de un concepto de presupuesto: cantidad × precio, menos su
// porcentaje de descuento (0–100).
export function importeConcepto(it: { cantidad: number; precio_unitario: number; descuento?: number | null }) {
  const bruto = it.cantidad * it.precio_unitario;
  const desc = Math.min(100, Math.max(0, Number(it.descuento) || 0));
  return bruto * (1 - desc / 100);
}
