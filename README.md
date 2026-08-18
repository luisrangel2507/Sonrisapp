# SonrisApp

Panel clínico y de lealtad para consultorios dentales. Next.js 14 (App Router) + PostgreSQL, pensado para desplegarse en Railway.

## Módulos

- **Panel** (`/dashboard`) — resumen de citas, leads y simulador del bot de WhatsApp.
- **Odontograma clínico** (`/dashboard/odontograma`) — mapa interactivo de los 32 dientes en notación FDI/Universal, con historial de tratamientos por diente.
- **Tarjeta de lealtad** (`/dashboard/lealtad`) — puntos, progreso hacia la recompensa y aviso de cumpleaños.

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

## Despliegue — Railway

1. Mismo proyecto/servicio de Railway para la app + un servicio de Postgres.
2. Antes de desplegar, corre `db/schema.sql` contra la base de Postgres de Railway.
3. Configura las variables de entorno de `.env.example` en el servicio.
4. Confirma que `public/` (contiene `odontograma-boca.jpg`) se incluya en el build — no está excluida en `.gitignore` ni requiere configuración extra de Nixpacks.
5. Deploy normal de Next.js (`npm run build && npm run start`), Railway lo detecta automáticamente vía Nixpacks.
