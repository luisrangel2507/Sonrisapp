import type { Cita } from "@/lib/types";

// Una cita "completada" no siempre significa que ya se cobró completo
// — se puede marcar completada con un pago parcial. El pago queda
// confirmado cuando no hay monto que cobrar (monto null) o ya se pagó
// todo. Antes de eso, aunque el tratamiento ya se hizo, la cita sigue
// "con confirmación de pago pendiente".
export function pagoConfirmado(cita: Pick<Cita, "monto" | "pagado">) {
  return cita.monto == null || cita.pagado >= cita.monto;
}
