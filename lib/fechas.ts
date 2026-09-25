// Convierte una columna DATE de Postgres a un Date en horario LOCAL
// sin desfasarse un día. Puede llegar como string ISO con hora (p. ej.
// "2026-08-19T00:00:00.000Z", ya pasada por JSON en una respuesta de
// API) o como objeto Date (pg parsea las columnas DATE a Date del
// lado del servidor, p. ej. en las rutas de PDF que leen la fila
// directo de la base). `new Date(iso)` interpreta esa media noche
// como UTC, y en cualquier zona horaria detrás de UTC (todo
// México/Latam) los getters locales (getDate/getMonth/getFullYear)
// terminan devolviendo el día anterior — por eso no se usa aquí.
export function fechaSoloDia(fecha: string | Date): Date {
  if (fecha instanceof Date) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  }
  const [y, m, d] = fecha.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Fecha de hoy en horario local, como "YYYY-MM-DD" — para el atributo
// max de <input type="date"> (p. ej. no permitir fechas de nacimiento
// futuras) y para valores por defecto de formularios.
export function hoyISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Valida en el servidor que una fecha (p. ej. de nacimiento) no sea
// futura — el atributo max del input es solo una ayuda visual, no
// impide mandar cualquier fecha por la API directamente.
export function esFechaFutura(fechaISO: string): boolean {
  return fechaISO.slice(0, 10) > new Date().toISOString().slice(0, 10);
}

// Cuántas horas después de la hora de la cita se considera "vencida"
// si sigue agendada — tiempo suficiente para que la doctora la marque
// como completada sin que se dispare la alerta de inmediato.
const HORAS_PARA_VENCIDA = 2;

export function citaVencidaSinCompletar(cita: { estado: string; fecha_hora: string }): boolean {
  if (cita.estado !== "agendada") return false;
  return new Date(cita.fecha_hora).getTime() + HORAS_PARA_VENCIDA * 60 * 60 * 1000 < Date.now();
}

// Edad cumplida a una fecha dada (por defecto hoy) — para mostrarla en
// documentos como la receta, calculada a partir de la fecha de
// nacimiento en vez de pedirle a la doctora que la escriba a mano.
export function calcularEdad(fechaNacimiento: string | Date, enFecha: Date = new Date()): number {
  const nacimiento = fechaSoloDia(fechaNacimiento);
  let edad = enFecha.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    enFecha.getMonth() < nacimiento.getMonth() ||
    (enFecha.getMonth() === nacimiento.getMonth() && enFecha.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad--;
  return edad;
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
