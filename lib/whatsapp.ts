// Envío de mensajes vía WhatsApp Cloud API (Meta).
// Requiere WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID en el entorno.

const WHATSAPP_API_VERSION = "v20.0";

// Los teléfonos se capturan como 10 dígitos locales (México). La API de
// WhatsApp Cloud necesita el número completo en formato E.164 (código de
// país sin "+"), así que se normaliza aquí una sola vez para que todos los
// envíos (existentes y nuevos) queden cubiertos.
function normalizarTelefonoMx(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, "");
  if (digitos.length === 10) return `52${digitos}`;
  if (digitos.length === 12 && digitos.startsWith("52")) return digitos;
  if (digitos.length === 13 && digitos.startsWith("521")) return digitos;
  if (digitos.length >= 10) return digitos;
  return null;
}

export async function enviarWhatsApp(telefono: string, mensaje: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const numero = normalizarTelefonoMx(telefono);

  if (!numero) {
    console.warn("[whatsapp] teléfono inválido, mensaje no enviado:", { telefono, mensaje });
    return { skipped: true };
  }

  if (!token || !phoneNumberId) {
    console.warn("[whatsapp] WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados, mensaje no enviado:", {
      telefono: numero,
      mensaje,
    });
    return { skipped: true };
  }

  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: numero,
        type: "text",
        text: { body: mensaje },
      }),
    }
  );

  if (!response.ok) {
    const detalle = await response.text();
    throw new Error(`WhatsApp API error (${response.status}): ${detalle}`);
  }

  return response.json();
}

export function mensajeCumpleanos(nombre: string) {
  return `¡Feliz cumpleaños, ${nombre}! 🎂 Todo el equipo de Viña Sonrisas te desea un excelente día. Como regalito, tienes 20% de descuento en tu próxima limpieza este mes.`;
}

export function mensajeMetaAlcanzada(nombre: string, premio: string) {
  return `¡Felicidades, ${nombre}! 🎉 Llegaste a tu meta de puntos en tu tarjeta de lealtad Viña Sonrisas y desbloqueaste: ${premio}. Agenda tu cita cuando gustes para reclamarlo.`;
}

export function mensajeResumenHoy(nombre: string, citas: { hora: string; tratamiento: string }[]) {
  const primerNombre = nombre.split(" ")[0];
  const lineas = citas.map((c) => `• ${c.hora} — ${c.tratamiento}`).join("\n");
  const frase = citas.length > 1 ? "tus citas de hoy son" : "tu cita de hoy es";
  return `¡Buenos días, ${primerNombre}! 🦷 Te recordamos que ${frase}:\n${lineas}\n\nTe esperamos en Viña Sonrisas. Si necesitas reagendar, avísanos por este medio.`;
}

export function mensajeRecordatorio1h(nombre: string, hora: string, tratamiento: string) {
  const primerNombre = nombre.split(" ")[0];
  return `¡Hola, ${primerNombre}! ⏰ Tu cita de ${tratamiento} es en aproximadamente 1 hora, a las ${hora} ¡Te esperamos en Viña Sonrisas!`;
}

export function mensajePostConsulta(nombre: string, tratamiento: string, saldoPendiente: number) {
  const primerNombre = nombre.split(" ")[0];
  const saldoTexto =
    saldoPendiente > 0
      ? `\n\nTienes un saldo pendiente de $${saldoPendiente.toFixed(2)}.`
      : "";
  return `¡Gracias por tu visita, ${primerNombre}! ✨ Hoy realizamos: ${tratamiento}.${saldoTexto}\n\nSi sientes alguna molestia o tienes dudas sobre tu tratamiento, escríbenos por este medio. — Viña Sonrisas`;
}
