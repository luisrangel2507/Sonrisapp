import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { ZONA, dinero, esc, identidadLigera, irA, pagina } from "@/lib/ligera";

export const dynamic = "force-dynamic";

function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Agenda de un día: citas con su estado y pago, y acciones rápidas.
export async function GET(req: NextRequest) {
  const identidad = await identidadLigera(req);
  if (!identidad) return irA(req, "/ligera");

  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
  const param = req.nextUrl.searchParams.get("fecha");
  const fecha = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hoy;
  const aviso = req.nextUrl.searchParams.get("aviso");

  const { rows: citas } = await query<{
    id: number;
    paciente_id: number;
    paciente_nombre: string;
    tratamiento: string;
    hora: string;
    estado: string;
    monto: number | null;
    pagado: number;
    pendiente_aprobacion: boolean;
  }>(
    `SELECT c.id, c.paciente_id, p.nombre AS paciente_nombre, c.tratamiento,
            to_char(c.fecha_hora AT TIME ZONE '${ZONA}', 'HH24:MI') AS hora,
            c.estado, c.monto::float8 AS monto, c.pendiente_aprobacion,
            COALESCE((SELECT SUM(monto) FROM pagos WHERE cita_id = c.id), 0)::float8 AS pagado
     FROM citas c JOIN pacientes p ON p.id = c.paciente_id
     WHERE (c.fecha_hora AT TIME ZONE '${ZONA}')::date = $1::date
     ORDER BY c.fecha_hora`,
    [fecha]
  );

  const titulo = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${fecha}T12:00:00Z`)
  );

  const lista = citas.length
    ? citas
        .map((c) => {
          const falta = c.monto != null ? Math.max(0, c.monto - c.pagado) : 0;
          const estado = c.pendiente_aprobacion ? "por aprobar" : c.estado === "completada" && falta > 0 ? "pago pendiente" : c.estado;
          const claseEstado = c.estado === "completada" && falta <= 0 ? "completada" : c.estado === "cancelada" ? "cancelada" : "agendada";
          const acciones =
            c.estado === "cancelada"
              ? ""
              : `
            ${
              c.estado === "agendada"
                ? `<form method="post" action="/ligera/accion" style="display:inline">
                     <input type="hidden" name="accion" value="completar"><input type="hidden" name="id" value="${c.id}">
                     <input type="hidden" name="fecha" value="${fecha}">
                     <button class="btn verde" type="submit">Completada</button></form>`
                : ""
            }
            <form method="post" action="/ligera/accion" style="display:inline">
              <input type="hidden" name="accion" value="sala"><input type="hidden" name="nombre" value="${esc(c.paciente_nombre)}">
              <input type="hidden" name="hora" value="${c.hora}"><input type="hidden" name="fecha" value="${fecha}">
              <button class="btn btn2" type="submit">Bienvenida en sala</button></form>
            ${
              falta > 0
                ? `<form method="post" action="/ligera/accion" class="pagof" style="margin-top:6px">
                     <input type="hidden" name="accion" value="pago"><input type="hidden" name="id" value="${c.id}">
                     <input type="hidden" name="paciente_id" value="${c.paciente_id}"><input type="hidden" name="fecha" value="${fecha}">
                     <input name="monto" type="number" min="1" step="1" value="${Math.round(falta)}" style="width:110px">
                     <select name="metodo"><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select>
                     <button class="btn" type="submit">Registrar pago</button></form>`
                : ""
            }`;
          return `<div class="tarjeta">
            <div class="fila"><b class="izq">${c.hora}</b><span class="der etq ${claseEstado}">${esc(estado)}</span></div>
            <div style="font-size:19px;font-weight:bold;margin-top:6px">${esc(c.paciente_nombre)}</div>
            <div class="muted">${esc(c.tratamiento)}${c.monto != null ? ` · ${dinero(c.pagado)} de ${dinero(c.monto)}` : ""}</div>
            <div style="margin-top:8px">${acciones}</div>
          </div>`;
        })
        .join("")
    : `<div class="tarjeta muted">Sin citas este día.</div>`;

  return pagina(
    "Agenda",
    `<div class="nav"><a class="btn btn2" href="/ligera/agenda?fecha=${sumarDias(fecha, -1)}">‹ Anterior</a>
      <a class="btn btn2" href="/ligera/agenda">Hoy</a>
      <a class="btn btn2" href="/ligera/agenda?fecha=${sumarDias(fecha, 1)}">Siguiente ›</a></div>
    <h1 style="text-align:center">${esc(fecha === hoy ? "Hoy, " + titulo : titulo)}</h1>
    ${aviso ? `<p class="${aviso.startsWith("Error") ? "err" : "ok"}" style="text-align:center">${esc(aviso)}</p>` : ""}
    ${lista}
    <p style="text-align:center"><a class="btn btn2" href="/ligera">Menú</a></p>`,
    // Se refresca sola cada 2 minutos para ver citas nuevas.
    `<meta http-equiv="refresh" content="120">`
  );
}
