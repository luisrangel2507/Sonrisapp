// Campos del formulario de historia clínica — un solo lugar para
// mantener en sync las rutas que leen/escriben esta tabla (la del
// dashboard y la del link público que llena el paciente).
export const HISTORIA_CLINICA_CAMPOS = [
  "fecha",
  "sexo",
  "nombre_padre_tutor",
  "domicilio",
  "ocupacion",
  "emergencia_nombre",
  "emergencia_telefono",
  "motivo_consulta",
  "fam_enfermedad_sistemica",
  "fam_enfermedad_cual",
  "enfermedad_actual",
  "enfermedad_actual_cual",
  "toma_medicamento",
  "alergico_medicamento",
  "alergico_medicamento_cual",
  "alergico_anestesico",
  "alergico_anestesico_cual",
  "cirugia_previa",
  "cirugia_previa_cual",
  "problemas_sangrado",
  "embarazada",
  "lactancia",
  "consume_alcohol",
  "consume_tabaco",
  "ets",
  "ets_cual",
] as const;

export const HISTORIA_CLINICA_COLUMNAS = `${HISTORIA_CLINICA_CAMPOS.join(", ")}, actualizado_en`;
