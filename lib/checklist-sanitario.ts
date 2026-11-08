// Requisitos de operación que revisa una verificación sanitaria en un
// consultorio dental. No sustituye la lectura de cada norma.
export const CHECKLIST_SANITARIO: { norma: string; items: [clave: string, texto: string][] }[] = [
  {
    norma: "Documentos y permisos",
    items: [
      ["aviso_funcionamiento", "Aviso de funcionamiento ante COFEPRIS / Secretaría de Salud estatal"],
      ["responsable_sanitario", "Aviso de responsable sanitario"],
      ["titulo_cedula_visibles", "Título y cédula profesional a la vista del público"],
      ["aviso_privacidad_visible", "Aviso de privacidad disponible para los pacientes"],
      ["horario_visible", "Horario de atención y nombre del responsable a la vista"],
    ],
  },
  {
    norma: "NOM-005 · Infraestructura y equipo",
    items: [
      ["sala_espera", "Sala de espera separada del área de atención"],
      ["lavabo", "Lavabo con agua corriente, jabón y toallas desechables en el área clínica"],
      ["sanitario", "Sanitario para pacientes"],
      ["unidad_dental", "Unidad dental funcionando con mantenimiento registrado"],
      ["botiquin_urgencias", "Botiquín de urgencias con medicamentos vigentes"],
      ["extintor", "Extintor vigente y señalización de protección civil"],
      ["iluminacion_ventilacion", "Iluminación y ventilación adecuadas"],
    ],
  },
  {
    norma: "NOM-013 · Control de infecciones",
    items: [
      ["autoclave", "Autoclave funcionando, con bitácora de ciclos al día"],
      ["testigo_biologico", "Testigo biológico al menos una vez por semana"],
      ["barreras", "Uso de guantes, cubrebocas, lentes y bata; barreras desechables en la unidad"],
      ["desinfeccion", "Desinfección de superficies entre pacientes"],
      ["vacuna_hepatitis", "Personal vacunado contra hepatitis B y tétanos"],
      ["instrumental_empaquetado", "Instrumental esterilizado en paquetes con fecha"],
    ],
  },
  {
    norma: "NOM-087 · Residuos (RPBI)",
    items: [
      ["contenedor_punzocortantes", "Contenedor rojo rígido para punzocortantes"],
      ["bolsas_rpbi", "Bolsas rojas para no anatómicos y amarillas para patológicos"],
      ["almacen_temporal", "Área de almacenamiento temporal identificada"],
      ["contrato_recolector", "Contrato con empresa recolectora autorizada"],
      ["manifiestos", "Manifiestos de entrega archivados"],
    ],
  },
  {
    norma: "NOM-229 · Rayos X (solo si hay equipo)",
    items: [
      ["licencia_rx", "Licencia sanitaria / permiso del equipo de rayos X"],
      ["mandil_plomado", "Mandil y collarín plomados para el paciente"],
      ["dosimetro", "Dosímetro para el personal ocupacionalmente expuesto"],
      ["control_calidad_rx", "Control de calidad y mantenimiento del equipo"],
      ["senalizacion_rx", "Señalización de zona con radiación"],
    ],
  },
];
