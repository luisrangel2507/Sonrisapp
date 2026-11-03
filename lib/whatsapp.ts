// Envío de mensajes vía WhatsApp Cloud API (Meta).
// Requiere WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID en el entorno.
//
// Dos modos:
// - Texto libre (default): como siempre. Meta solo lo entrega si el
//   paciente escribió en las últimas 24 h.
// - Plantillas (WHATSAPP_PLANTILLAS=1): manda las plantillas aprobadas en
//   Meta (ver PLANTILLAS_META abajo), que llegan aunque el paciente no
//   haya escrito. Activarlo solo cuando Meta las haya aprobado todas.
//
// "{clinica}" y "{doctor}" se reemplazan al enviar con la marca de la
// clínica (Perfil → Identidad), para que sirva en cualquier consultorio.
import { obtenerMarca } from "@/lib/marca";

const WHATSAPP_API_VERSION = "v20.0";

export interface MensajeWa {
  texto: string;
  plantilla?: {
    nombre: string;
    parametros: string[];
    // Payload de cada botón de respuesta rápida, en el orden de la plantilla.
    botones?: string[];
  };
}

// Los teléfonos se capturan como 10 dígitos locales (México). La API de
// WhatsApp Cloud necesita el número completo en formato E.164 (código de
// país sin "+").
export function normalizarTelefonoMx(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, "");
  if (digitos.length === 10) return `52${digitos}`;
  if (digitos.length === 12 && digitos.startsWith("52")) return digitos;
  if (digitos.length === 13 && digitos.startsWith("521")) return digitos;
  if (digitos.length >= 10) return digitos;
  return null;
}

export const usaPlantillas = () => process.env.WHATSAPP_PLANTILLAS === "1";

// Meta no acepta saltos de línea, tabs ni más de 4 espacios seguidos en
// los parámetros de una plantilla, ni parámetros vacíos.
function limpiarParametro(v: string) {
  const s = v.replace(/[\n\r\t]+/g, " · ").replace(/ {2,}/g, " ").trim();
  return s || "-";
}

async function llamarApi(cuerpo: Record<string, unknown>) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.warn("[whatsapp] WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados, mensaje no enviado:", cuerpo);
    return { skipped: true };
  }
  const response = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...cuerpo }),
  });
  if (!response.ok) {
    const detalle = await response.text();
    throw new Error(`WhatsApp API error (${response.status}): ${detalle}`);
  }
  return response.json();
}

export async function enviarWhatsApp(telefono: string, mensaje: string | MensajeWa) {
  const numero = normalizarTelefonoMx(telefono);
  const m: MensajeWa = typeof mensaje === "string" ? { texto: mensaje } : mensaje;
  if (!numero) {
    console.warn("[whatsapp] teléfono inválido, mensaje no enviado:", { telefono });
    return { skipped: true };
  }
  const marca = await obtenerMarca();
  const poner = (s: string) => s.replaceAll("{clinica}", marca.clinicaNombre).replaceAll("{doctor}", marca.doctorNombre);

  if (usaPlantillas() && m.plantilla) {
    const componentes: Record<string, unknown>[] = [
      {
        type: "body",
        parameters: m.plantilla.parametros.map((p) => ({ type: "text", text: limpiarParametro(poner(p)) })),
      },
    ];
    (m.plantilla.botones ?? []).forEach((payload, i) =>
      componentes.push({
        type: "button",
        sub_type: "quick_reply",
        index: String(i),
        parameters: [{ type: "payload", payload }],
      })
    );
    return llamarApi({
      to: numero,
      type: "template",
      template: {
        name: m.plantilla.nombre,
        language: { code: process.env.WHATSAPP_IDIOMA || "es_MX" },
        components: componentes,
      },
    });
  }

  return llamarApi({ to: numero, type: "text", text: { body: poner(m.texto) } });
}

const primer = (nombre: string) => nombre.trim().split(/\s+/)[0];

export function mensajeCumpleanos(nombre: string): MensajeWa {
  return {
    texto: `¡Feliz cumpleaños, ${nombre}! 🎂 Todo el equipo de {clinica} te desea un excelente día. Como regalito, tienes 20% de descuento en tu próxima limpieza este mes.`,
    plantilla: { nombre: "cumpleanos", parametros: [primer(nombre), "{clinica}"] },
  };
}

export function mensajeMetaAlcanzada(nombre: string, premio: string): MensajeWa {
  return {
    texto: `¡Felicidades, ${nombre}! 🎉 Llegaste a tu meta de puntos en tu tarjeta de lealtad {clinica} y desbloqueaste: ${premio}. Agenda tu cita cuando gustes para reclamarlo.`,
    plantilla: { nombre: "meta_lealtad", parametros: [primer(nombre), "{clinica}", premio] },
  };
}

export function mensajeResumenHoy(nombre: string, citas: { hora: string; tratamiento: string }[]): MensajeWa {
  const lineas = citas.map((c) => `• ${c.hora} — ${c.tratamiento}`).join("\n");
  const frase = citas.length > 1 ? "tus citas de hoy son" : "tu cita de hoy es";
  return {
    texto: `¡Buenos días, ${primer(nombre)}! 🦷 Te recordamos que ${frase}:\n${lineas}\n\nTe esperamos en {clinica}. Si necesitas reagendar, avísanos por este medio.`,
    plantilla: {
      nombre: "resumen_hoy",
      parametros: [primer(nombre), citas.map((c) => `${c.hora} ${c.tratamiento}`).join("; "), "{clinica}"],
    },
  };
}

export function mensajeRecordatorio1h(nombre: string, hora: string, tratamiento: string): MensajeWa {
  return {
    texto: `¡Hola, ${primer(nombre)}! ⏰ Tu cita de ${tratamiento} es en aproximadamente 1 hora, a las ${hora} ¡Te esperamos en {clinica}!`,
    plantilla: { nombre: "recordatorio_1h", parametros: [primer(nombre), tratamiento, hora, "{clinica}"] },
  };
}

// Recordatorio un día antes, con botones "Confirmo" / "Necesito reagendar".
// citaIds viaja en el payload del botón para saber qué citas contestó.
export function mensajeConfirmarCita(
  nombre: string,
  fechaTexto: string,
  citas: { hora: string; tratamiento: string }[],
  citaIds: number[]
): MensajeWa {
  const detalle = citas.map((c) => `${c.tratamiento} a las ${c.hora}`).join(" y ");
  return {
    texto: `¡Hola, ${primer(nombre)}! 🦷 Te recordamos tu cita de ${detalle} mañana ${fechaTexto} en {clinica}.\n\n¿Nos confirmas tu asistencia? Responde *1* para confirmar o *2* si necesitas reagendar.`,
    plantilla: {
      nombre: "confirmar_cita",
      parametros: [primer(nombre), detalle, fechaTexto, "{clinica}"],
      botones: [`CONFIRMAR:${citaIds.join(",")}`, `REAGENDAR:${citaIds.join(",")}`],
    },
  };
}

export function mensajeSolicitudCita(nombre: string, fechaTexto: string, horaTexto: string): MensajeWa {
  return {
    texto: `¡Hola, ${primer(nombre)}! 🦷 Recibimos tu solicitud de cita para el ${fechaTexto} a las ${horaTexto} en {clinica}. En breve te confirmamos por este medio.`,
    plantilla: { nombre: "solicitud_cita", parametros: [primer(nombre), fechaTexto, horaTexto, "{clinica}"] },
  };
}

export function mensajeRecetaNueva(nombre: string, url: string): MensajeWa {
  return {
    texto: `¡Hola, ${primer(nombre)}! 📋 {doctor} te dejó una receta nueva. Puedes verla aquí: ${url}`,
    plantilla: { nombre: "receta_nueva", parametros: [primer(nombre), "{doctor}", url] },
  };
}

export function mensajePostConsulta(
  nombre: string,
  tratamiento: string,
  saldoPendiente: number,
  urlEncuesta?: string | null
): MensajeWa {
  const saldoTexto = saldoPendiente > 0 ? `Tienes un saldo pendiente de $${saldoPendiente.toFixed(2)}.` : "";
  const encuesta = urlEncuesta ? `\n\n¿Cómo te atendimos? Califícanos en 10 segundos: ${urlEncuesta}` : "";
  return {
    texto: `¡Gracias por tu visita, ${primer(nombre)}! ✨ Hoy realizamos: ${tratamiento}.${saldoTexto ? `\n\n${saldoTexto}` : ""}${encuesta}\n\nSi sientes alguna molestia o tienes dudas sobre tu tratamiento, escríbenos por este medio. — {clinica}`,
    plantilla: {
      nombre: "post_consulta",
      parametros: [primer(nombre), tratamiento, saldoTexto || "Sin saldo pendiente.", urlEncuesta || "-", "{clinica}"],
    },
  };
}

// Respuesta en texto libre: solo dentro de la ventana de 24 h (p. ej.
// justo después de que el paciente tocó "Confirmo").
export async function responderWhatsApp(telefono: string, texto: string) {
  return enviarWhatsApp(telefono, { texto });
}

// Textos para dar de alta en Meta (WhatsApp Manager → Plantillas). El
// nombre y el orden de las variables deben coincidir con lo de arriba.
export const PLANTILLAS_META = [
  { nombre: "confirmar_cita", categoria: "UTILITY", texto: "¡Hola, {{1}}! Te recordamos tu cita de {{2}} mañana {{3}} en {{4}}. ¿Nos confirmas tu asistencia?", botones: ["Confirmo", "Necesito reagendar"] },
  { nombre: "recordatorio_1h", categoria: "UTILITY", texto: "¡Hola, {{1}}! Tu cita de {{2}} es en aproximadamente 1 hora, a las {{3}}. ¡Te esperamos en {{4}}!" },
  { nombre: "resumen_hoy", categoria: "UTILITY", texto: "¡Buenos días, {{1}}! Te recordamos tu cita de hoy: {{2}}. Te esperamos en {{3}}. Si necesitas reagendar, avísanos por este medio." },
  { nombre: "solicitud_cita", categoria: "UTILITY", texto: "¡Hola, {{1}}! Recibimos tu solicitud de cita para el {{2}} a las {{3}} en {{4}}. En breve te confirmamos por este medio." },
  { nombre: "receta_nueva", categoria: "UTILITY", texto: "¡Hola, {{1}}! {{2}} te dejó una receta nueva. Puedes verla aquí: {{3}}" },
  { nombre: "post_consulta", categoria: "UTILITY", texto: "¡Gracias por tu visita, {{1}}! Hoy realizamos: {{2}}. {{3}} ¿Cómo te atendimos? Califícanos aquí: {{4}} Si tienes dudas sobre tu tratamiento, escríbenos por este medio. — {{5}}" },
  { nombre: "cumpleanos", categoria: "MARKETING", texto: "¡Feliz cumpleaños, {{1}}! Todo el equipo de {{2}} te desea un excelente día. Como regalito, tienes 20% de descuento en tu próxima limpieza este mes." },
  { nombre: "meta_lealtad", categoria: "MARKETING", texto: "¡Felicidades, {{1}}! Llegaste a tu meta de puntos en tu tarjeta de lealtad {{2}} y desbloqueaste: {{3}}. Agenda tu cita cuando gustes para reclamarlo." },
] as const;
