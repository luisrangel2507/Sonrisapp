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
  titulo: "Lic. en Odontología",
  universidad: "Universidad Cuauhtémoc Querétaro",
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
