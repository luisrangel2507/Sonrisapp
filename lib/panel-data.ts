// Catálogo usado por el bot de WhatsApp y como sugerencias al agendar.

export const TRATAMIENTOS = [
  { nombre: "Limpieza dental", precio: "$800 – $1,200", duracion: "45 min" },
  { nombre: "Brackets metálicos", precio: "$18,000 – $28,000", duracion: "60 min/sesión" },
  { nombre: "Blanqueamiento", precio: "$2,500 – $4,000", duracion: "60 min" },
  { nombre: "Extracción simple", precio: "$900 – $1,500", duracion: "30 min" },
  { nombre: "Resina / empaste", precio: "$700 – $1,400", duracion: "40 min" },
];

export const CLINICA = {
  direccion: "Av. Constituyentes 123, Querétaro, Qro.",
  horario: "Lun–Vie 9:00–19:00, Sáb 9:00–14:00",
  especialidades: ["Ortodoncia", "Estética dental", "Limpieza", "Odontología general"],
};

export const SYSTEM_PROMPT = `Eres el asistente de WhatsApp de una clínica dental en Querétaro, México. Respondes en español, cálido y breve (máximo 3-4 líneas, 1 emoji como máximo).

Datos de la clínica:
- Dirección: ${CLINICA.direccion}
- Horario: ${CLINICA.horario}
- Especialidades: ${CLINICA.especialidades.join(", ")}
- Catálogo de precios:
${TRATAMIENTOS.map((t) => `  • ${t.nombre}: ${t.precio} (${t.duracion})`).join("\n")}

Responde dudas sobre horarios, precios, ubicación y especialidades usando SOLO estos datos. Si detectas intención de agendar, guía paso a paso (tratamiento → fecha/hora que prefiere → nombre) y di que un asesor confirmará el horario exacto.`;
