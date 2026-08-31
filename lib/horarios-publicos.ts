// Horarios de atención en formato calculable (no solo texto), para el
// agendado público (/agendar). Usa el mismo horario que CLINICA.horario
// en lib/panel-data.ts — si ese cambia, hay que actualizar esto también.
// Domingo (día 0) cerrado, no aparece en el mapa.
export const FRANJAS_ATENCION: Record<number, { inicio: number; fin: number }> = {
  1: { inicio: 9, fin: 19 },
  2: { inicio: 9, fin: 19 },
  3: { inicio: 9, fin: 19 },
  4: { inicio: 9, fin: 19 },
  5: { inicio: 9, fin: 19 },
  6: { inicio: 9, fin: 14 },
};

const INTERVALO_MINUTOS = 30;

// Horarios disponibles ("09:00", "09:30"…) para un día de la semana
// (0=domingo…6=sábado) — vacío si ese día el consultorio no abre.
export function horariosDelDia(diaSemana: number): string[] {
  const franja = FRANJAS_ATENCION[diaSemana];
  if (!franja) return [];
  const horarios: string[] = [];
  for (let minutos = franja.inicio * 60; minutos < franja.fin * 60; minutos += INTERVALO_MINUTOS) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    horarios.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return horarios;
}

// El servidor (Railway) no necesariamente corre en hora de México, así
// que leer fecha.getHours()/getDay() ahí daría el día/hora equivocados.
// Esto calcula la hora de pared en México (UTC-6 fijo, México ya no
// cambia de horario en la mayor parte del país) desplazando el
// instante UTC y leyendo con los getters UTC — funciona sin importar
// en qué zona horaria esté corriendo el proceso.
const OFFSET_MEXICO_HORAS = -6;

export function horaYDiaEnMexico(fecha: Date) {
  const desplazado = new Date(fecha.getTime() + OFFSET_MEXICO_HORAS * 60 * 60 * 1000);
  return {
    diaSemana: desplazado.getUTCDay(),
    horaMinuto: `${String(desplazado.getUTCHours()).padStart(2, "0")}:${String(desplazado.getUTCMinutes()).padStart(2, "0")}`,
  };
}
