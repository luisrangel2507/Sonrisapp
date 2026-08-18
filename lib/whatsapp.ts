// Envío de mensajes vía WhatsApp Cloud API (Meta).
// Requiere WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID en el entorno.

const WHATSAPP_API_VERSION = "v20.0";

export async function enviarWhatsApp(telefono: string, mensaje: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn("[whatsapp] WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados, mensaje no enviado:", {
      telefono,
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
        to: telefono,
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
  return `¡Feliz cumpleaños, ${nombre}! 🎂 Todo el equipo de SonrisApp te desea un excelente día. Como regalito, tienes 20% de descuento en tu próxima limpieza este mes.`;
}

export function mensajeMetaAlcanzada(nombre: string, premio: string) {
  return `¡Felicidades, ${nombre}! 🎉 Llegaste a tu meta de puntos en tu tarjeta de lealtad SonrisApp y desbloqueaste: ${premio}. Agenda tu cita cuando gustes para reclamarlo.`;
}
