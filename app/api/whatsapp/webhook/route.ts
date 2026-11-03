import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { enviarPush } from "@/lib/push";
import { responderWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// Webhook de WhatsApp Cloud API (Meta → Configuración → Webhooks).
// URL: https://<tu-dominio>/api/whatsapp/webhook, campo "messages".
// Requiere WHATSAPP_VERIFY_TOKEN (lo inventas tú y lo pegas en Meta) y
// WHATSAPP_APP_SECRET (Meta → Configuración de la app → Básica) para
// validar que cada aviso realmente viene de Meta.

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (esperado && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === esperado) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "no autorizado" }, { status: 403 });
}

function firmaValida(cuerpo: string, firma: string | null) {
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto || !firma?.startsWith("sha256=")) return false;
  const esperada = Buffer.from(createHmac("sha256", secreto).update(cuerpo).digest("hex"));
  const recibida = Buffer.from(firma.slice(7));
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

type Accion = "confirmada" | "reagendar";

// "CONFIRMAR:12,13" (botón de plantilla) o texto libre ("1", "confirmo", "2"...).
function interpretar(mensaje: Record<string, unknown>): { accion: Accion; ids: number[] | null } | null {
  const boton = (mensaje.button as { payload?: string } | undefined)?.payload
    ?? (mensaje.interactive as { button_reply?: { id?: string } } | undefined)?.button_reply?.id;
  if (boton) {
    const [tipo, lista] = boton.split(":");
    const ids = (lista ?? "").split(",").map(Number).filter(Number.isInteger);
    if (tipo === "CONFIRMAR") return { accion: "confirmada", ids };
    if (tipo === "REAGENDAR") return { accion: "reagendar", ids };
    return null;
  }
  const texto = ((mensaje.text as { body?: string } | undefined)?.body ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  if (/^(1|si|confirmo|confirmado|confirmar|ok|va|ahi estare|alli estare)\b/.test(texto)) return { accion: "confirmada", ids: null };
  if (/^(2|reagendar|no puedo|cambiar|mover|otra fecha|cancelar)\b/.test(texto)) return { accion: "reagendar", ids: null };
  return null;
}

async function procesar(mensaje: Record<string, unknown>) {
  const de = String(mensaje.from ?? "").replace(/\D/g, "");
  if (de.length < 10) return;
  const ultimos10 = de.slice(-10);
  const r = interpretar(mensaje);
  if (!r) return;

  // Solo citas agendadas de ESTE teléfono a las que les pedimos
  // confirmación y que aún no pasan (si vienen ids, solo esas).
  const { rows } = await query<{ id: number; paciente_id: number; nombre: string; fecha_hora: string; tratamiento: string }>(
    `UPDATE citas c SET confirmacion = $2, confirmacion_en = now()
     FROM pacientes p
     WHERE p.id = c.paciente_id
       AND right(regexp_replace(coalesce(p.telefono, ''), '\\D', '', 'g'), 10) = $1
       AND c.estado = 'agendada' AND c.confirmacion_enviada = true AND c.fecha_hora > now()
       AND c.fecha_hora < now() + interval '3 days'
       AND ($3::int[] IS NULL OR c.id = ANY($3::int[]))
     RETURNING c.id, c.paciente_id, p.nombre, c.fecha_hora, c.tratamiento`,
    [ultimos10, r.accion, r.ids && r.ids.length ? r.ids : null]
  );
  if (rows.length === 0) return;

  const p = rows[0];
  const cuando = rows
    .map((c) =>
      new Date(c.fecha_hora).toLocaleString("es-MX", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Mexico_City",
      })
    )
    .join(", ");

  if (r.accion === "confirmada") {
    await responderWhatsApp(de, "¡Gracias! ✅ Tu cita quedó confirmada. Te esperamos.").catch(() => {});
    await enviarPush(`Cita confirmada · ${cuando}`, `${p.nombre.trim()} · ${p.tratamiento}`, `/dashboard/pacientes/${p.paciente_id}`, `cita-${p.id}`).catch(() => {});
  } else {
    await query(
      `INSERT INTO solicitudes_paciente (paciente_id, mensaje) VALUES ($1, $2)`,
      [p.paciente_id, `Pidió reagendar por WhatsApp su cita de ${p.tratamiento} (${cuando}).`]
    );
    await responderWhatsApp(de, "Listo, avisamos a la clínica. En breve te escribimos para buscar otro horario. 🗓️").catch(() => {});
    await enviarPush(`Pide reagendar · ${cuando}`, `${p.nombre.trim()} · ${p.tratamiento}`, `/dashboard/pacientes/${p.paciente_id}`, `cita-${p.id}`).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  const cuerpo = await req.text();
  if (cuerpo.length > 200_000 || !firmaValida(cuerpo, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }
  try {
    const datos = JSON.parse(cuerpo);
    for (const entrada of datos?.entry ?? []) {
      for (const cambio of entrada?.changes ?? []) {
        for (const mensaje of cambio?.value?.messages ?? []) {
          await procesar(mensaje).catch((err) => console.error("[whatsapp webhook]", err));
        }
      }
    }
  } catch (err) {
    console.error("[whatsapp webhook] cuerpo inválido", err);
  }
  // Siempre 200 para que Meta no reintente en bucle.
  return NextResponse.json({ ok: true });
}
