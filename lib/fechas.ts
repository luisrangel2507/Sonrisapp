// Convierte una columna DATE de Postgres (llega al cliente como ISO
// con hora, p. ej. "2026-08-19T00:00:00.000Z") a un Date en horario
// LOCAL sin desfasarse un día. `new Date(iso)` interpreta esa media
// noche como UTC, y en cualquier zona horaria detrás de UTC (todo
// México/Latam) los getters locales (getDate/getMonth/getFullYear)
// terminan devolviendo el día anterior.
export function fechaSoloDia(fecha: string): Date {
  const [y, m, d] = fecha.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function proximoCumpleanos(fechaNacimiento: string | null) {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const nacimiento = fechaSoloDia(fechaNacimiento);
  const cumpleEsteAnio = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  const diffDias = Math.ceil((cumpleEsteAnio.getTime() - hoy.getTime()) / 86_400_000);
  const diasEnRango = diffDias >= 0 && diffDias <= 14;
  const proximaFecha = diffDias < 0
    ? new Date(hoy.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate())
    : cumpleEsteAnio;
  const fechaTexto = proximaFecha.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return { proximo: diasEnRango, fechaTexto };
}
