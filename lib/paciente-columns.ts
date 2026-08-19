// Columnas devueltas por las rutas de pacientes — un solo lugar para
// mantener el SELECT/RETURNING en sync con lib/types.ts#Paciente.
export const PACIENTE_COLUMNAS = `
  id, nombre, telefono, email, folio, puntos, meta_premio, premio_actual,
  fecha_nacimiento, visitas_totales, creado_en, alergias, medicamentos,
  antecedentes_medicos, historial_token
`;
