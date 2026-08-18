# SonrisApp

Panel clínico y de lealtad para consultorios dentales. Next.js 14 (App Router) + PostgreSQL, pensado para desplegarse en Railway.

## Módulos

- **Panel** (`/dashboard`) — resumen de citas, leads y simulador del bot de WhatsApp.
- **Pacientes** (`/dashboard/pacientes`) — lista con búsqueda y alta; `/dashboard/pacientes/[id]` es el expediente clínico (datos, antecedentes/alergias/medicamentos, historial general).
- **Odontograma clínico** (`/dashboard/odontograma`) — mapa interactivo de los 32 dientes en notación FDI/Universal, con historial de tratamientos por diente.
- **Lealtad** (`/dashboard/lealtad`) — lista de todos los pacientes con su status de puntos/progreso; `/dashboard/lealtad/[id]` es la tarjeta individual con aviso de cumpleaños.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completa DATABASE_URL como mínimo
psql "$DATABASE_URL" -f db/schema.sql
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — redirige a `/dashboard`. Si no hay pacientes todavía, el selector de paciente en Odontograma/Lealtad ofrece un botón para crear uno de prueba.

## Variables de entorno

Ver `.env.example`:

- `DATABASE_URL` — cadena de conexión de Postgres.
- `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` — WhatsApp Cloud API, para felicitaciones de cumpleaños y avisos de meta de puntos. Si faltan, los mensajes solo se registran en consola (no se envían).
- `CRON_SECRET` — protege `POST /api/cron`.
- `ANTHROPIC_API_KEY` — opcional, habilita el simulador del bot en el Panel (`/api/bot`).

## Reglas de puntos (tarjeta de lealtad)

- +50 pts por visita completada (se aplica automáticamente al marcar una cita como `completada` vía `PATCH /api/citas`).
- +20 pts por referido (a registrar manualmente por ahora).
- Al llegar a `meta_premio` (500 pts por defecto), se envía un WhatsApp automático avisando el premio desbloqueado.

## Cron diario

`lib/cron/crm-diario.ts` revisa cumpleaños del día y envía la felicitación por WhatsApp. Se dispara vía `POST /api/cron` con el header `x-cron-secret: $CRON_SECRET`. En Railway, agrega un **Cron Job** (o un servicio externo tipo cron-job.org) que haga ese POST una vez al día.

## Despliegue — Railway (vía GitHub)

1. En [railway.app](https://railway.app), **New Project → Deploy from GitHub repo** y selecciona `luisrangel2507/Sonrisapp`, rama `claude/dame-esto-plis-iprbf2` (o la que uses como producción). Railway detecta Next.js automáticamente con Nixpacks — no necesitas Dockerfile.
2. En el mismo proyecto, **+ New → Database → PostgreSQL** para crear el servicio de base de datos.
3. En el servicio de la app, pestaña **Variables**, agrega las de `.env.example`:
   - `DATABASE_URL` — usa la referencia `${{Postgres.DATABASE_URL}}` de Railway (autocompletado al escribir `${{`) en vez de copiarla a mano.
   - `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` — credenciales de WhatsApp Cloud API.
   - `CRON_SECRET` — cualquier cadena aleatoria larga.
   - `ANTHROPIC_API_KEY` — opcional, para el bot del Panel.
4. Antes de que el primer deploy reciba tráfico real, corre `db/schema.sql` contra la base: en la pestaña del servicio Postgres usa **Connect** para obtener la cadena y corre `psql "$DATABASE_URL" -f db/schema.sql` desde tu máquina (o el botón "Query" del dashboard de Railway pegando el contenido del archivo).
5. `public/odontograma-boca.jpg` ya viaja en el repo y no está excluida en `.gitignore` — no requiere configuración extra.
6. Cada push a la rama conectada dispara un deploy automático. El healthcheck usa `/api/health`.
7. Para las felicitaciones de cumpleaños, agrega un **Cron Job** en Railway (o un servicio externo como cron-job.org) que haga `POST` diario a `https://<tu-dominio>.up.railway.app/api/cron` con el header `x-cron-secret: <CRON_SECRET>`.
