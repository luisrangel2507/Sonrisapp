// Datos de muestra para el panel principal — en producción vendrían de
// Postgres (leads, citas) igual que pacientes/citas. Fuera del alcance
// de este build (odontograma + tarjeta de lealtad).

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

export const CITAS_HOY = [
  { paciente: "Fer Osorio", hora: "10:00", tratamiento: "Brackets — ajuste" },
  { paciente: "Karla Sánchez", hora: "12:00", tratamiento: "Valoración ortodoncia" },
];

export const LEADS_INICIALES = [
  { id: 1, nombre: "Karla Sánchez", interes: "Ortodoncia", score: 85, estado: "agendado" },
  { id: 2, nombre: "Diego Ramírez", interes: "Blanqueamiento", score: 60, estado: "contactado" },
  { id: 3, nombre: "Sin nombre · 442 501 7739", interes: "Limpieza dental", score: 35, estado: "nuevo" },
];

export const SYSTEM_PROMPT = `Eres el asistente de WhatsApp de una clínica dental en Querétaro, México. Respondes en español, cálido y breve (máximo 3-4 líneas, 1 emoji como máximo).

Datos de la clínica:
- Dirección: ${CLINICA.direccion}
- Horario: ${CLINICA.horario}
- Especialidades: ${CLINICA.especialidades.join(", ")}
- Catálogo de precios:
${TRATAMIENTOS.map((t) => `  • ${t.nombre}: ${t.precio} (${t.duracion})`).join("\n")}

Responde dudas sobre horarios, precios, ubicación y especialidades usando SOLO estos datos. Si detectas intención de agendar, guía paso a paso (tratamiento → fecha/hora que prefiere → nombre) y di que un asesor confirmará el horario exacto.`;
