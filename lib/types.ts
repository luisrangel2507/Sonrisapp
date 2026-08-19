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

export interface HistoriaClinica {
  fecha: string;
  sexo: "F" | "M" | null;
  nombre_padre_tutor: string | null;
  domicilio: string | null;
  ocupacion: string | null;
  emergencia_nombre: string | null;
  emergencia_telefono: string | null;
  motivo_consulta: string | null;
  fam_enfermedad_sistemica: boolean | null;
  fam_enfermedad_cual: string | null;
  enfermedad_actual: string | null;
  toma_medicamento: string | null;
  alergico_medicamento: boolean | null;
  alergico_medicamento_cual: string | null;
  alergico_anestesico: boolean | null;
  alergico_anestesico_cual: string | null;
  cirugia_previa: boolean | null;
  cirugia_previa_cual: string | null;
  problemas_sangrado: boolean | null;
  embarazada: boolean | null;
  lactancia: boolean | null;
  consume_alcohol: boolean | null;
  consume_tabaco: boolean | null;
  ets: boolean | null;
  ets_cual: string | null;
  actualizado_en: string;
}
