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
  direccion: "Calle Técnicos #134, Col. Nuevo Horizonte, CP 76148",
  horario: "Lun–Vie 9:00–19:00, Sáb 9:00–14:00",
  especialidades: TRATAMIENTOS,
};

export const DOCTORA = {
  nombre: "Dra. Daniela Michel Galván Salazar",
  cedula: "13551924",
};

// Contenido de la tarjeta de presentación digital (/tarjeta) — calcado
// de la tarjeta física que ya usa la doctora (mismo nombre corto,
// mismo texto de "sufres de...?" y la misma frase de cierre), para que
// la versión digital se vea como la continuación de la misma tarjeta.
export const TARJETA_DENTISTA = {
  nombreCorto: "Dra. Michell Galván",
  titulo: "Odontóloga",
  sintomas: [
    "Inseguridad al sonreír",
    "Dientes encimados",
    "Dientes amarillos",
    "Sensibilidad dental",
    "Encías que sangran",
    "Caries dental",
  ],
  frase: "Tu sonrisa es tu mejor carta de presentación",
  llamadaAccion: "Agenda tu valoración",
};

export const SYSTEM_PROMPT = `Eres el asistente de WhatsApp de una clínica dental en Querétaro, México. Respondes en español, cálido y breve (máximo 3-4 líneas, 1 emoji como máximo).

Datos de la clínica:
- Dirección: ${CLINICA.direccion}
- Horario: ${CLINICA.horario}
- Servicios: ${CLINICA.especialidades.join(", ")}

Responde dudas sobre horarios, ubicación y servicios usando SOLO estos datos. El precio exacto depende de cada caso, así que si preguntan por precios, di que se define en la valoración con la doctora y ofrece agendar. Si detectas intención de agendar, guía paso a paso (servicio → fecha/hora que prefiere → nombre) y di que un asesor confirmará el horario exacto.`;
