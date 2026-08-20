# Viña Sonrisas

Panel clínico y de lealtad para consultorios dentales. Next.js 14 (App Router) + PostgreSQL, pensado para desplegarse en Railway.

## Módulos

- **Login** (`/login`) — acceso del consultorio (un solo usuario). Todo `/dashboard` y las APIs de datos están protegidas por `middleware.ts`; sin sesión válida, redirige aquí.
- **Panel** (`/dashboard`) — citas de hoy, citas de la semana, ingresos del mes, por cobrar, y simulador del bot de WhatsApp.
- **Pacientes** (`/dashboard/pacientes`) — lista con búsqueda y alta; `/dashboard/pacientes/[id]` es el expediente clínico completo (datos, antecedentes/alergias/medicamentos, historial general y, al final, el odontograma interactivo de ese paciente — mapa de los 32 dientes en notación FDI/Universal con historial de tratamientos por diente).
- **Citas** (`/dashboard/citas`) — agenda: crear cita (con monto), marcar completada/cancelada, registrar pagos (abonos parciales o completos, por método).
- **Lealtad** (`/dashboard/lealtad`) — lista de todos los pacientes con su status de puntos/progreso; `/dashboard/lealtad/[id]` es la tarjeta individual con aviso de cumpleaños.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completa DATABASE_URL, APP_LOGIN_USER/PASSWORD y SESSION_SECRET como mínimo
psql "$DATABASE_URL" -f db/schema.sql
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — te manda a `/login`; entra con las credenciales que pusiste en `APP_LOGIN_USER`/`APP_LOGIN_PASSWORD` y de ahí redirige a `/dashboard`. Si no hay pacientes todavía, la lista de Pacientes ofrece dar de alta uno.

## Variables de entorno

Ver `.env.example`:

- `DATABASE_URL` — cadena de conexión de Postgres.
- `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` — WhatsApp Cloud API, para felicitaciones de cumpleaños y avisos de meta de puntos. Si faltan, los mensajes solo se registran en consola (no se envían).
- `CRON_SECRET` — protege `POST /api/cron`.
- `ANTHROPIC_API_KEY` — opcional, habilita el simulador del bot en el Panel (`/api/bot`).
- `APP_LOGIN_USER` / `APP_LOGIN_PASSWORD` — credenciales del único usuario del consultorio. Sin ellas, `/api/auth/login` responde error 500 (login no configurado).
- `SESSION_SECRET` — cadena aleatoria larga que firma la cookie de sesión (`openssl rand -hex 32` o similar). Cámbiala y se cierran todas las sesiones activas.

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
   - `APP_LOGIN_USER` / `APP_LOGIN_PASSWORD` — el usuario y contraseña con los que entrarás en `/login`.
   - `SESSION_SECRET` — otra cadena aleatoria larga (distinta a `CRON_SECRET`).
4. Antes de que el primer deploy reciba tráfico real, corre `db/schema.sql` contra la base: en la pestaña del servicio Postgres usa **Connect** para obtener la cadena y corre `psql "$DATABASE_URL" -f db/schema.sql` desde tu máquina (o el botón "Query" del dashboard de Railway pegando el contenido del archivo).
5. `public/odontograma-boca.jpg` ya viaja en el repo y no está excluida en `.gitignore` — no requiere configuración extra.
6. Cada push a la rama conectada dispara un deploy automático. El healthcheck usa `/api/health`.
7. Para las felicitaciones de cumpleaños, agrega un **Cron Job** en Railway (o un servicio externo como cron-job.org) que haga `POST` diario a `https://<tu-dominio>.up.railway.app/api/cron` con el header `x-cron-secret: <CRON_SECRET>`.
