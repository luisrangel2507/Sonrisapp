const formateador = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function formatearDinero(monto: number) {
  return formateador.format(monto);
}
