export interface Paciente {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  folio: string | null;
  puntos: number;
  meta_premio: number;
  premio_actual: string | null;
  fecha_nacimiento: string | null;
  visitas_totales: number;
  creado_en: string;
  alergias: string | null;
  medicamentos: string | null;
  antecedentes_medicos: string | null;
}

export interface PacienteNota {
  id: number;
  fecha: string;
  tipo: string;
  nota: string | null;
}

export type EstadoCita = "agendada" | "completada" | "cancelada";

export interface Cita {
  id: number;
  paciente_id: number;
  paciente_nombre: string;
  tratamiento: string;
  fecha_hora: string;
  estado: EstadoCita;
  monto: number | null;
  pagado: number;
}

export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export interface Pago {
  id: number;
  cita_id: number;
  monto: number;
  metodo: MetodoPago;
  fecha: string;
  nota: string | null;
}

export interface ResumenDashboard {
  citas_hoy: number;
  citas_semana: number;
  citas_semana_confirmadas: number;
  ingresos_mes: number;
  por_cobrar: number;
}
