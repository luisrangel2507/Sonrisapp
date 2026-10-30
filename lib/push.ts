import webpush from "web-push";
import { obtenerMarca } from "@/lib/marca";
import { query } from "@/lib/db";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:soporte@sonrisapp.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface Suscripcion {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Manda una notificación push a todos los dispositivos donde se activó
// (Perfil → Notificaciones). Si una suscripción ya caducó (404/410 —
// el usuario desinstaló la app o la borró desde su navegador), se
// limpia sola de la tabla.
//
// Formato: arriba (título) siempre va el nombre de la clínica; el asunto
// ("Cita en 1 hora") y el detalle van en las líneas siguientes.
export async function enviarPush(asunto: string, detalle: string, url?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configurados, notificación no enviada");
    return { enviados: 0 };
  }

  const { rows } = await query<Suscripcion>(
    `SELECT id, endpoint, p256dh, auth FROM push_subscripciones`
  );

  const marca = await obtenerMarca();
  const payload = JSON.stringify({
    title: marca.clinicaNombre,
    body: [asunto, detalle].filter(Boolean).join("\n"),
    url: url ?? "/dashboard",
  });

  let enviados = 0;
  for (const sub of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      enviados++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await query(`DELETE FROM push_subscripciones WHERE id = $1`, [sub.id]);
      } else {
        console.error("[push] error enviando notificación:", err);
      }
    }
  }

  return { enviados };
}
