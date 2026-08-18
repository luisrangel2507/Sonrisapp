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
