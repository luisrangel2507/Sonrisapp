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
  alergias: boolean | null;
  alergias_cual: string | null;
  medicamentos: string | null;
  antecedentes_medicos: boolean | null;
  antecedentes_medicos_cual: string | null;
  historial_token: string | null;
  // true si el paciente llenó/actualizó su historial desde el link
  // público y la doctora todavía no lo revisó. Ausente en el GET de un
  // solo paciente (solo se calcula en la lista) — el objeto Paciente
  // ahí no lo incluye, pero se agrega vía intersección donde se usa.
  historial_pendiente?: boolean;
}

export interface PacienteNota {
  id: number;
  fecha: string;
  tipo: string;
  nota: string | null;
  tratamiento: string | null;
  duracion: string | null;
  archivo: string | null;
  archivo_nombre: string | null;
  archivo_tipo: string | null;
  creado_por_nombre: string | null;
  vigente: boolean;
  motivo_anulacion: string | null;
  anulado_por_nombre: string | null;
  subido_en: string;
}

export interface Receta {
  id: number;
  fecha: string;
  diagnostico: string | null;
  medicamentos: string;
  indicaciones: string | null;
  creado_por_nombre: string | null;
  creado_en: string;
  vigente: boolean;
  motivo_anulacion: string | null;
  anulado_por_nombre: string | null;
}

export type EstadoConsentimiento = "pendiente" | "firmado";

export interface Consentimiento {
  id: number;
  paciente_id: number;
  titulo: string;
  contenido: string;
  token: string;
  estado: EstadoConsentimiento;
  firma: string | null;
  nombre_firma: string | null;
  firmado_en: string | null;
  creado_en: string;
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
  historial_pendiente: boolean;
  pendiente_aprobacion: boolean;
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

export interface Usuario {
  id: number;
  nombre: string;
  usuario: string;
  rol: "admin" | "asistente";
  creado_en: string;
}

export interface Passkey {
  id: number;
  nombre_dispositivo: string;
  creado_en: string;
}

export interface InventarioItem {
  id: number;
  nombre: string;
  cantidad: number;
  unidad: string | null;
  cantidad_minima: number | null;
  notas: string | null;
  actualizado_en: string;
}

export interface HistoriaClinica {
  fecha: string;
  sexo: "F" | "M" | null;
  nombre_padre_tutor: string | null;
  domicilio: string | null;
  codigo_postal: string | null;
  ciudad: string | null;
  estado: string | null;
  pais: string | null;
  ocupacion: string | null;
  emergencia_nombre: string | null;
  emergencia_telefono: string | null;
  emergencia_parentesco: string | null;
  motivo_consulta: string | null;
  fam_enfermedad_sistemica: boolean | null;
  fam_enfermedad_cual: string | null;
  enfermedad_actual: boolean | null;
  enfermedad_actual_cual: string | null;
  toma_medicamento: boolean | null;
  toma_medicamento_cual: string | null;
  alergico_medicamento: boolean | null;
  alergico_medicamento_cual: string | null;
  alergico_anestesico: boolean | null;
  alergico_anestesico_cual: string | null;
  cirugia_previa: boolean | null;
  cirugia_previa_cual: string | null;
  problemas_sangrado: boolean | null;
  embarazada: boolean | null;
  lactancia: boolean | null;
  consume_alcohol: "si" | "no" | "a_veces" | null;
  consume_tabaco: "si" | "no" | "a_veces" | null;
  ets: boolean | null;
  ets_cual: string | null;
  actualizado_en: string;
}
