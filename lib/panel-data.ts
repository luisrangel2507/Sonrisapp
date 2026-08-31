// Catálogo usado por el bot de WhatsApp y como sugerencias al agendar.

export const TRATAMIENTOS = [
  "Ortodoncia",
  "Odontología integral",
  "Cirugía maxilofacial",
  "Endodoncia",
  "Prótesis dental",
  "Implantología",
  "Periodoncia",
];

export const CLINICA = {
  direccion: "Calle Técnicos #134, Col. Nuevo Horizonte",
  horario: "Lun–Vie 9:00–19:00, Sáb 9:00–14:00",
  especialidades: TRATAMIENTOS,
};

export const DOCTORA = {
  nombre: "Dra. Daniela Michel Galván Salazar",
  cedula: "13551924",
};

export const SYSTEM_PROMPT = `Eres el asistente de WhatsApp de una clínica dental en Querétaro, México. Respondes en español, cálido y breve (máximo 3-4 líneas, 1 emoji como máximo).

Datos de la clínica:
- Dirección: ${CLINICA.direccion}
- Horario: ${CLINICA.horario}
- Servicios: ${CLINICA.especialidades.join(", ")}

Responde dudas sobre horarios, ubicación y servicios usando SOLO estos datos. El precio exacto depende de cada caso, así que si preguntan por precios, di que se define en la valoración con la doctora y ofrece agendar. Si detectas intención de agendar, guía paso a paso (servicio → fecha/hora que prefiere → nombre) y di que un asesor confirmará el horario exacto.`;
