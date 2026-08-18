export function proximoCumpleanos(fechaNacimiento: string | null) {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const nacimiento = new Date(fechaNacimiento);
  const cumpleEsteAnio = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  const diffDias = Math.ceil((cumpleEsteAnio.getTime() - hoy.getTime()) / 86_400_000);
  const diasEnRango = diffDias >= 0 && diffDias <= 14;
  const proximaFecha = diffDias < 0
    ? new Date(hoy.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate())
    : cumpleEsteAnio;
  const fechaTexto = proximaFecha.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return { proximo: diasEnRango, fechaTexto };
}
