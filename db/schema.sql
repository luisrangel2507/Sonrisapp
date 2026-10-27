-- SonrisApp — esquema de base de datos (Postgres / Railway)
-- Corre este archivo completo contra la base antes de desplegar.
-- Es seguro volver a correrlo: usa IF NOT EXISTS / ADD COLUMN IF NOT
-- EXISTS, así que pone al día una base que ya corrió una versión
-- anterior de este archivo sin perder datos.

CREATE TABLE IF NOT EXISTS pacientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  telefono VARCHAR(20),
  email VARCHAR(160),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Tarjeta de lealtad
  folio VARCHAR(20) UNIQUE,
  puntos INTEGER NOT NULL DEFAULT 0,
  meta_premio INTEGER DEFAULT 500,
  premio_actual VARCHAR(120) DEFAULT 'Limpieza dental gratis',
  fecha_nacimiento DATE,
  visitas_totales INTEGER NOT NULL DEFAULT 0,
  ultima_felicitacion_anio INTEGER,
  ultimo_aviso_meta_en TIMESTAMPTZ,
  -- Historial clínico general
  alergias BOOLEAN,
  alergias_cual TEXT,
  medicamentos TEXT,
  antecedentes_medicos BOOLEAN,
  antecedentes_medicos_cual TEXT,
  -- Token para el link público donde el paciente llena su propia
  -- historia clínica (ver /formulario/[token]).
  historial_token VARCHAR(40) UNIQUE
);

-- Por si esta base ya corrió una versión anterior de este archivo
-- (antes de que existieran estas columnas):
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS alergias TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS medicamentos TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS antecedentes_medicos TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS historial_token VARCHAR(40) UNIQUE;

-- alergias/antecedentes_medicos empezaron como texto libre; se separan
-- en Sí/No + "cuál" (mismo patrón que enfermedad_actual en historia_clinica)
-- — se renombra la columna vieja a _cual para no perder lo ya
-- capturado, y se agrega la columna booleana nueva.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pacientes' AND column_name = 'alergias' AND data_type = 'text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pacientes' AND column_name = 'alergias_cual'
  ) THEN
    ALTER TABLE pacientes RENAME COLUMN alergias TO alergias_cual;
  END IF;
END $$;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS alergias BOOLEAN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pacientes' AND column_name = 'antecedentes_medicos' AND data_type = 'text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pacientes' AND column_name = 'antecedentes_medicos_cual'
  ) THEN
    ALTER TABLE pacientes RENAME COLUMN antecedentes_medicos TO antecedentes_medicos_cual;
  END IF;
END $$;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS antecedentes_medicos BOOLEAN;

CREATE TABLE IF NOT EXISTS citas (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  tratamiento VARCHAR(160) NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'agendada',
  -- 'agendada' | 'completada' | 'cancelada'
  monto NUMERIC(10,2),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE citas ADD COLUMN IF NOT EXISTS monto NUMERIC(10,2);
-- Evita mandar el recordatorio de "1 hora antes" más de una vez por cita.
ALTER TABLE citas ADD COLUMN IF NOT EXISTS recordatorio_1h_enviado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS aviso_2h_enviado BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS paciente_dientes (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  numero_fdi SMALLINT NOT NULL CHECK (numero_fdi BETWEEN 11 AND 48),
  estado VARCHAR(20) NOT NULL DEFAULT 'sano',
  -- 'sano' | 'observacion' | 'caries' | 'tratado' | 'extraido'
  UNIQUE (paciente_id, numero_fdi)
);

-- Trazabilidad tipo NOM-024: nada se borra de verdad. "Editar" inserta
-- una fila nueva (con reemplaza_a apuntando a la anterior) y marca la
-- vieja vigente=false; "eliminar" solo marca vigente=false con un
-- motivo — el registro original queda intacto y visible para
-- auditoría, la app solo deja de mostrarlo como el dato "actual".
CREATE TABLE IF NOT EXISTS diente_historial (
  id SERIAL PRIMARY KEY,
  paciente_diente_id INTEGER REFERENCES paciente_dientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo VARCHAR(80) NOT NULL, -- 'Resina', 'Limpieza', 'Endodoncia'...
  nota TEXT,
  creado_por INTEGER, -- id de usuarios, cuando aplica
  creado_por_nombre VARCHAR(160),
  vigente BOOLEAN NOT NULL DEFAULT true,
  reemplaza_a INTEGER REFERENCES diente_historial(id),
  motivo_anulacion TEXT,
  anulado_por_nombre VARCHAR(160),
  anulado_en TIMESTAMPTZ
);

ALTER TABLE diente_historial ADD COLUMN IF NOT EXISTS creado_por_nombre VARCHAR(160);
ALTER TABLE diente_historial ADD COLUMN IF NOT EXISTS vigente BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE diente_historial ADD COLUMN IF NOT EXISTS reemplaza_a INTEGER REFERENCES diente_historial(id);
ALTER TABLE diente_historial ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;
ALTER TABLE diente_historial ADD COLUMN IF NOT EXISTS anulado_por_nombre VARCHAR(160);
ALTER TABLE diente_historial ADD COLUMN IF NOT EXISTS anulado_en TIMESTAMPTZ;

-- Historial clínico general del paciente (consultas, diagnósticos, notas)
-- — separado del historial por diente en diente_historial.
CREATE TABLE IF NOT EXISTS paciente_notas (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo VARCHAR(80) NOT NULL, -- 'Consulta', 'Diagnóstico', 'Nota general'...
  nota TEXT,
  creado_por INTEGER, -- id del doctor
  -- Archivo adjunto (radiografía, foto, PDF) — data URL base64 ya
  -- comprimida desde el cliente, igual que perfil_dentista.foto.
  archivo TEXT,
  archivo_nombre VARCHAR(200),
  archivo_tipo VARCHAR(80)
);

ALTER TABLE paciente_notas ADD COLUMN IF NOT EXISTS archivo TEXT;
ALTER TABLE paciente_notas ADD COLUMN IF NOT EXISTS archivo_nombre VARCHAR(200);
ALTER TABLE paciente_notas ADD COLUMN IF NOT EXISTS archivo_tipo VARCHAR(80);
-- Qué tratamiento se hizo y cuánto duró, para las entradas del
-- historial clínico general (ej. "Endodoncia" · "45 min").
ALTER TABLE paciente_notas ADD COLUMN IF NOT EXISTS tratamiento VARCHAR(120);
ALTER TABLE paciente_notas ADD COLUMN IF NOT EXISTS duracion VARCHAR(60);
-- Trazabilidad tipo NOM-024 (igual que en diente_historial): "eliminar"
-- una nota solo la marca vigente=false con un motivo, nunca la borra.
ALTER TABLE paciente_notas ADD COLUMN IF NOT EXISTS creado_por_nombre VARCHAR(160);
ALTER TABLE paciente_notas ADD COLUMN IF NOT EXISTS vigente BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE paciente_notas ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;
ALTER TABLE paciente_notas ADD COLUMN IF NOT EXISTS anulado_por_nombre VARCHAR(160);
ALTER TABLE paciente_notas ADD COLUMN IF NOT EXISTS anulado_en TIMESTAMPTZ;
-- Fecha y hora exactas en que se subió la entrada (a diferencia de
-- "fecha", que es solo el día y no se puede editar hoy) — para poder
-- mostrar un log de cuándo se adjuntó cada estudio.
ALTER TABLE paciente_notas ADD COLUMN IF NOT EXISTS subido_en TIMESTAMPTZ NOT NULL DEFAULT now();

-- Pagos — uno o varios por cita (permite abonos parciales).
CREATE TABLE IF NOT EXISTS pagos (
  id SERIAL PRIMARY KEY,
  cita_id INTEGER REFERENCES citas(id) ON DELETE CASCADE,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  monto NUMERIC(10,2) NOT NULL,
  metodo VARCHAR(30) NOT NULL DEFAULT 'efectivo',
  -- 'efectivo' | 'tarjeta' | 'transferencia'
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  nota TEXT
);

-- Historia clínica — formulario de ficha de identificación y
-- antecedentes. Trazabilidad tipo NOM-024: "guardar" nunca sobrescribe
-- la fila anterior — inserta una versión nueva (reemplaza_a apunta a
-- la anterior) y la marca vigente=false. Por eso paciente_id ya NO es
-- UNIQUE (puede haber varias versiones); el índice único parcial de
-- abajo garantiza que solo una esté vigente a la vez por paciente.
CREATE TABLE IF NOT EXISTS historia_clinica (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  creado_por INTEGER,
  creado_por_nombre VARCHAR(160),
  vigente BOOLEAN NOT NULL DEFAULT true,
  reemplaza_a INTEGER REFERENCES historia_clinica(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  sexo VARCHAR(1), -- 'F' | 'M'
  nombre_padre_tutor VARCHAR(160),
  domicilio VARCHAR(255), -- calle y número
  codigo_postal VARCHAR(10),
  ciudad VARCHAR(120),
  estado VARCHAR(120),
  pais VARCHAR(120),
  ocupacion VARCHAR(120),
  emergencia_nombre VARCHAR(160),
  emergencia_telefono VARCHAR(20),
  emergencia_parentesco VARCHAR(60),
  motivo_consulta TEXT,
  -- Antecedentes heredofamiliares
  fam_enfermedad_sistemica BOOLEAN,
  fam_enfermedad_cual TEXT,
  -- Antecedentes personales
  enfermedad_actual BOOLEAN,
  enfermedad_actual_cual TEXT,
  toma_medicamento BOOLEAN,
  toma_medicamento_cual TEXT,
  alergico_medicamento BOOLEAN,
  alergico_medicamento_cual TEXT,
  alergico_anestesico BOOLEAN,
  alergico_anestesico_cual TEXT,
  cirugia_previa BOOLEAN,
  cirugia_previa_cual TEXT,
  problemas_sangrado BOOLEAN,
  embarazada BOOLEAN,
  lactancia BOOLEAN,
  -- Antecedentes personales no patológicos
  consume_alcohol VARCHAR(10), -- 'si' | 'no' | 'a_veces'
  consume_tabaco VARCHAR(10), -- 'si' | 'no' | 'a_veces'
  ets BOOLEAN,
  ets_cual TEXT,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Cuando el paciente llena su historial desde el link público, queda
  -- sin confirmar hasta que la doctora lo revise (ver comentario más
  -- abajo). Si lo llena/corrige la doctora desde el dashboard, se
  -- marca confirmado de una vez — ella misma lo está capturando.
  confirmado BOOLEAN NOT NULL DEFAULT true,
  confirmado_por_nombre VARCHAR(160),
  confirmado_en TIMESTAMPTZ
);

ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS confirmado BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS confirmado_por_nombre VARCHAR(160);
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS confirmado_en TIMESTAMPTZ;

-- Trazabilidad de historia_clinica (ver comentario arriba de la
-- tabla): quita el UNIQUE viejo de una sola fila por paciente y agrega
-- las columnas de auditoría/versión.
ALTER TABLE historia_clinica DROP CONSTRAINT IF EXISTS historia_clinica_paciente_id_key;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS creado_por INTEGER;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS creado_por_nombre VARCHAR(160);
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS vigente BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS reemplaza_a INTEGER REFERENCES historia_clinica(id);
-- Garantiza que solo una versión esté "vigente" (la actual) por
-- paciente a la vez — las versiones anteriores siguen en la tabla
-- para auditoría, pero dejan de contar para esta unicidad.
CREATE UNIQUE INDEX IF NOT EXISTS idx_historia_clinica_vigente_unica ON historia_clinica (paciente_id) WHERE vigente = true;

-- El domicilio se separa en líneas: domicilio queda solo como calle y
-- número, y código postal/ciudad/estado/país son columnas aparte.
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(10);
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS ciudad VARCHAR(120);
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS estado VARCHAR(120);
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS pais VARCHAR(120);
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS emergencia_parentesco VARCHAR(60);

-- enfermedad_actual empezó como texto libre; se separa en Sí/No + "cuál"
-- (mismo patrón que fam_enfermedad_sistemica/_cual) — se renombra la
-- columna vieja a _cual para no perder las respuestas ya capturadas, y
-- se agrega la columna booleana nueva.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'historia_clinica' AND column_name = 'enfermedad_actual' AND data_type = 'text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'historia_clinica' AND column_name = 'enfermedad_actual_cual'
  ) THEN
    ALTER TABLE historia_clinica RENAME COLUMN enfermedad_actual TO enfermedad_actual_cual;
  END IF;
END $$;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS enfermedad_actual BOOLEAN;

-- Mismo caso que enfermedad_actual: toma_medicamento era texto libre,
-- se separa en Sí/No + "cuál".
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'historia_clinica' AND column_name = 'toma_medicamento' AND data_type = 'text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'historia_clinica' AND column_name = 'toma_medicamento_cual'
  ) THEN
    ALTER TABLE historia_clinica RENAME COLUMN toma_medicamento TO toma_medicamento_cual;
  END IF;
END $$;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS toma_medicamento BOOLEAN;

-- consume_alcohol/consume_tabaco ganan una tercera opción ("a veces"),
-- así que dejan de ser Sí/No booleano y pasan a texto ('si'/'no'/'a_veces').
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'historia_clinica' AND column_name = 'consume_alcohol' AND data_type = 'boolean'
  ) THEN
    ALTER TABLE historia_clinica
      ALTER COLUMN consume_alcohol TYPE VARCHAR(10)
      USING (CASE consume_alcohol WHEN true THEN 'si' WHEN false THEN 'no' ELSE NULL END);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'historia_clinica' AND column_name = 'consume_tabaco' AND data_type = 'boolean'
  ) THEN
    ALTER TABLE historia_clinica
      ALTER COLUMN consume_tabaco TYPE VARCHAR(10)
      USING (CASE consume_tabaco WHEN true THEN 'si' WHEN false THEN 'no' ELSE NULL END);
  END IF;
END $$;

-- Consentimientos informados con firma digital. El paciente entra con
-- el link público (token) igual que con la historia clínica, lee el
-- texto y firma con el dedo/mouse — la firma se guarda como imagen
-- (data URL base64, canvas) y ya no se puede volver a firmar.
CREATE TABLE IF NOT EXISTS consentimientos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  titulo VARCHAR(160) NOT NULL,
  contenido TEXT NOT NULL,
  token VARCHAR(40) UNIQUE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'firmado'
  firma TEXT,
  nombre_firma VARCHAR(160),
  firmado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consentimientos_paciente ON consentimientos(paciente_id);

-- Precio por defecto de cada servicio (configurable en el perfil del
-- dentista) — se usa para autorrellenar el monto al agendar.
CREATE TABLE IF NOT EXISTS precios_servicios (
  servicio VARCHAR(120) PRIMARY KEY,
  precio NUMERIC(10,2)
);

-- Foto de perfil de la doctora — una sola fila (id = 1), consultorio
-- de un solo dentista. Se guarda como data URL base64 ya comprimida
-- desde el cliente.
CREATE TABLE IF NOT EXISTS perfil_dentista (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  foto TEXT,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nombre corto que se usa en el saludo del Panel ("Bienvenida, X") —
-- separado del nombre legal completo (DOCTORA.nombre) que sí debe
-- mantenerse fijo en documentos formales (consentimientos, historia
-- clínica). Editable desde Perfil.
ALTER TABLE perfil_dentista ADD COLUMN IF NOT EXISTS nombre_bienvenida VARCHAR(60);

-- Teléfono de contacto para la tarjeta de presentación digital
-- (/tarjeta) — separado del WhatsApp Business (WHATSAPP_PHONE_NUMBER_ID
-- en el entorno), que es un ID de la API y no un número marcable.
ALTER TABLE perfil_dentista ADD COLUMN IF NOT EXISTS telefono VARCHAR(30);

-- Versión acortada (is.gd/TinyURL) del link público de agendado
-- (/agendar) — se genera una sola vez y se cachea aquí porque el
-- destino no cambia; para Instagram un link corto se ve/pega mejor
-- que la URL completa de Railway.
ALTER TABLE perfil_dentista ADD COLUMN IF NOT EXISTS link_agendar_corto TEXT;

-- Inventario de insumos del consultorio (materiales, anestésicos,
-- guantes, etc.) — cantidad_minima define cuándo se marca "bajo stock".
CREATE TABLE IF NOT EXISTS inventario (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 0,
  unidad VARCHAR(30),
  cantidad_minima NUMERIC(10,2),
  notas TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cuentas de acceso al panel (doctora + quien más necesite entrar).
-- El usuario admin original (APP_LOGIN_USER/APP_LOGIN_PASSWORD) se
-- sigue aceptando aparte para no romper el acceso ya configurado.
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  usuario VARCHAR(60) NOT NULL UNIQUE,
  contrasena_hash TEXT NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'admin', -- 'admin' | 'asistente'
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'admin';

-- Registro de avisos automáticos por WhatsApp ya enviados (por paciente,
-- por día, por tipo) — evita duplicar el resumen de "citas de hoy" si el
-- cron se dispara más de una vez el mismo día.
CREATE TABLE IF NOT EXISTS avisos_diarios (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  enviado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (paciente_id, fecha, tipo)
);

-- Suscripciones de notificaciones push del navegador (Web Push) — un
-- registro por dispositivo/celular donde la doctora/staff activó las
-- notificaciones desde Perfil. No lleva login asociado a propósito:
-- el consultorio es de pocas personas y todas deben enterarse.
CREATE TABLE IF NOT EXISTS push_subscripciones (
  id SERIAL PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Passkeys (Face ID / Touch ID) registradas para entrar sin usuario y
-- contraseña. Igual que push_subscripciones, no lleva login asociado
-- a propósito — cualquier passkey activada desde Perfil abre la misma
-- sesión compartida del consultorio.
CREATE TABLE IF NOT EXISTS passkeys (
  id SERIAL PRIMARY KEY,
  nombre_dispositivo TEXT NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  contador BIGINT NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marca que ya se mandó el push del resumen del día — evita duplicarlo
-- si el cron de las 8am se dispara más de una vez el mismo día.
CREATE TABLE IF NOT EXISTS avisos_push_diarios (
  fecha DATE PRIMARY KEY
);

-- Cifrado en reposo (NOM-024-SSA3-2012): el contenido clínico sensible
-- se guarda cifrado con AES-256-GCM (ver lib/crypto.ts), y el texto
-- cifrado es más largo que el original — estas columnas eran VARCHAR
-- con un límite que ya no alcanza, así que se amplían a TEXT.
ALTER TABLE historia_clinica ALTER COLUMN sexo TYPE TEXT;
ALTER TABLE historia_clinica ALTER COLUMN nombre_padre_tutor TYPE TEXT;
ALTER TABLE historia_clinica ALTER COLUMN domicilio TYPE TEXT;
ALTER TABLE historia_clinica ALTER COLUMN codigo_postal TYPE TEXT;
ALTER TABLE historia_clinica ALTER COLUMN ciudad TYPE TEXT;
ALTER TABLE historia_clinica ALTER COLUMN estado TYPE TEXT;
ALTER TABLE historia_clinica ALTER COLUMN pais TYPE TEXT;
ALTER TABLE historia_clinica ALTER COLUMN ocupacion TYPE TEXT;
ALTER TABLE historia_clinica ALTER COLUMN emergencia_nombre TYPE TEXT;
ALTER TABLE historia_clinica ALTER COLUMN emergencia_telefono TYPE TEXT;
ALTER TABLE historia_clinica ALTER COLUMN emergencia_parentesco TYPE TEXT;
ALTER TABLE historia_clinica ALTER COLUMN consume_alcohol TYPE TEXT;
ALTER TABLE historia_clinica ALTER COLUMN consume_tabaco TYPE TEXT;
ALTER TABLE paciente_notas ALTER COLUMN tratamiento TYPE TEXT;
ALTER TABLE paciente_notas ALTER COLUMN duracion TYPE TEXT;

-- Estados de diente que la doctora agrega además de los 15 fijos del
-- odontograma (ver ESTADO_DIENTE en lib/dental.ts) — por si algo no
-- está en la lista. Color en hex; se calcula solo, sin que la doctora
-- tenga que elegirlo.
CREATE TABLE IF NOT EXISTS estados_diente_personalizados (
  clave VARCHAR(30) PRIMARY KEY,
  etiqueta VARCHAR(60) NOT NULL,
  color VARCHAR(7) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- El estado de un diente ahora puede ser una clave personalizada más
-- larga que las 15 fijas — se amplía por si acaso.
ALTER TABLE paciente_dientes ALTER COLUMN estado TYPE VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_paciente_dientes_paciente ON paciente_dientes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_diente_historial_diente ON diente_historial(paciente_diente_id);
CREATE INDEX IF NOT EXISTS idx_paciente_notas_paciente ON paciente_notas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_cita ON pagos(cita_id);
CREATE INDEX IF NOT EXISTS idx_pagos_paciente ON pagos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_historia_clinica_paciente ON historia_clinica(paciente_id);

-- Límite de intentos de login (protección contra fuerza bruta): 5
-- intentos fallidos por usuario bloquean ese usuario 15 minutos. Se
-- guarda en la base (no en memoria) para que sobreviva un reinicio del
-- servidor y funcione igual si algún día corren varias instancias.
CREATE TABLE IF NOT EXISTS login_intentos (
  usuario VARCHAR(160) PRIMARY KEY,
  intentos SMALLINT NOT NULL DEFAULT 0,
  bloqueado_hasta TIMESTAMPTZ
);

-- Recetas médicas. Misma trazabilidad NOM-024 que paciente_notas:
-- "eliminar" no borra, marca vigente=false con un motivo. No hay
-- edición — si algo está mal en una receta ya entregada, se anula y se
-- crea una nueva (no se corrige en el mismo documento). El contenido
-- clínico se cifra en reposo igual que el resto del expediente.
CREATE TABLE IF NOT EXISTS recetas (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  diagnostico TEXT,
  medicamentos TEXT NOT NULL,
  indicaciones TEXT,
  creado_por INTEGER,
  creado_por_nombre VARCHAR(160),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  vigente BOOLEAN NOT NULL DEFAULT true,
  motivo_anulacion TEXT,
  anulado_por_nombre VARCHAR(160),
  anulado_en TIMESTAMPTZ
);
-- Peso del paciente al momento de la receta (para dosis pediátricas,
-- por ejemplo) — cifrado igual que el resto del contenido clínico.
ALTER TABLE recetas ADD COLUMN IF NOT EXISTS peso TEXT;

CREATE INDEX IF NOT EXISTS idx_recetas_paciente ON recetas(paciente_id);

-- Presupuestos/cotizaciones: la doctora arma una lista de conceptos con
-- precio y comparte un link público (mismo patrón que consentimientos)
-- donde el paciente ve el desglose y el total, y aprueba o rechaza sin
-- necesitar cuenta.
CREATE TABLE IF NOT EXISTS presupuestos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  titulo VARCHAR(160) NOT NULL,
  notas TEXT,
  token VARCHAR(40) UNIQUE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'aprobado' | 'rechazado'
  nombre_respuesta VARCHAR(160),
  respondido_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS presupuesto_items (
  id SERIAL PRIMARY KEY,
  presupuesto_id INTEGER NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  concepto VARCHAR(160) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_presupuestos_paciente ON presupuestos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_items_presupuesto ON presupuesto_items(presupuesto_id);

-- Dientes (numeración FDI) a los que aplica el presupuesto — marcados
-- a mano en un mini odontograma al armarlo, para que se vea de un
-- vistazo cuáles están involucrados (en la app, el link público y el PDF).
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS dientes INTEGER[] NOT NULL DEFAULT '{}';

-- Citas que llegan solas desde el link público de agendado (/agendar,
-- pensado para compartir en Instagram) — quedan apartadas en el
-- horario elegido, pero no son oficiales hasta que la doctora las
-- aprueba desde el dashboard (evita que una cita rara o un horario
-- mal elegido se cuele directo a la agenda sin que nadie la vea).
ALTER TABLE citas ADD COLUMN IF NOT EXISTS pendiente_aprobacion BOOLEAN NOT NULL DEFAULT false;

-- Auditoría NOM-024 para consentimientos y presupuestos: igual que
-- recetas/paciente_notas/diente_historial, "eliminar" ya no borra el
-- documento — lo marca vigente=false con motivo y quién lo anuló, para
-- que un consentimiento firmado o un presupuesto no puedan desaparecer
-- sin dejar rastro.
ALTER TABLE consentimientos ADD COLUMN IF NOT EXISTS vigente BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE consentimientos ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;
ALTER TABLE consentimientos ADD COLUMN IF NOT EXISTS anulado_por_nombre VARCHAR(160);
ALTER TABLE consentimientos ADD COLUMN IF NOT EXISTS anulado_en TIMESTAMPTZ;

ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS vigente BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS anulado_por_nombre VARCHAR(160);
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS anulado_en TIMESTAMPTZ;

-- Baja de un paciente (NOM-024: el expediente nunca se borra de
-- verdad) — "eliminar" desactiva la ficha en vez de un DELETE que,
-- por el ON DELETE CASCADE de citas/pagos/historia_clinica/etc.,
-- destruiría también las versiones vigente=false que se guardaban
-- para auditoría.
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS motivo_baja TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS dado_de_baja_por_nombre VARCHAR(160);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS dado_de_baja_en TIMESTAMPTZ;

-- Expiración de los links públicos de un solo trámite (firmar un
-- consentimiento, responder un presupuesto) — mientras siguen
-- pendientes, 90 días después de creados dejan de aceptarse (hay que
-- generar uno nuevo). Uno ya firmado/respondido NO expira: ese link
-- es el que la propia doctora reutiliza para "Ver" el documento desde
-- el panel, y es el registro de lo que se acordó.
ALTER TABLE consentimientos ADD COLUMN IF NOT EXISTS expira_en TIMESTAMPTZ DEFAULT (now() + interval '90 days');
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS expira_en TIMESTAMPTZ DEFAULT (now() + interval '90 days');

-- Derechos ARCO (NOM-024 / protección de datos personales): que el
-- paciente pueda pedir acceso, corrección o cancelación de su
-- información desde su propio portal, sin depender de escribirle por
-- WhatsApp a la clínica y que se pierda el registro. El mensaje es
-- texto libre que puede incluir datos personales, así que se cifra
-- igual que el resto del contenido clínico.
CREATE TABLE IF NOT EXISTS solicitudes_paciente (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  mensaje TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'resuelta'
  respuesta TEXT,
  resuelta_por_nombre VARCHAR(160),
  resuelta_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_paciente_paciente ON solicitudes_paciente(paciente_id);

-- Bitácora de accesos (NOM-024: trazabilidad de quién consulta el
-- expediente, no solo de quién lo modifica). usuario_nombre = NULL
-- significa que fue el propio paciente entrando con su link público.
CREATE TABLE IF NOT EXISTS bitacora_accesos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL, -- 'expediente' | 'consentimiento' | 'presupuesto' | 'portal' | 'formulario'
  usuario_nombre VARCHAR(160),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bitacora_accesos_paciente ON bitacora_accesos(paciente_id, creado_en DESC);

-- Igual que con paciente_notas/diente_historial: "deshacer" un pago no
-- lo hace desaparecer sin dejar rastro. Se sigue borrando de la tabla
-- pagos (para no tocar las sumas de ingresos/por-cobrar que ya se
-- calculan en varios reportes), pero el motivo y quién lo deshizo
-- quedan aquí.
CREATE TABLE IF NOT EXISTS pagos_revertidos (
  id SERIAL PRIMARY KEY,
  pago_id INTEGER NOT NULL,
  cita_id INTEGER,
  paciente_id INTEGER,
  monto NUMERIC(10,2) NOT NULL,
  metodo VARCHAR(30),
  motivo TEXT NOT NULL,
  revertido_por_nombre VARCHAR(160),
  revertido_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Concepto de un ítem de presupuesto es texto libre que puede
-- describir el diagnóstico/tratamiento — se cifra en reposo (NOM-024)
-- igual que el resto del contenido clínico. Se ensancha de VARCHAR(160)
-- a TEXT porque cifrado ocupa más espacio que el texto plano original.
ALTER TABLE presupuesto_items ALTER COLUMN concepto TYPE TEXT;

-- Historia clínica ampliada al formato completo de la doctora (4
-- páginas en papel). Dos grupos:
--  1) Las preguntas nuevas que llena el PACIENTE desde el link público
--     (antecedentes heredofamiliares detallados, resto de antecedentes
--     personales patológicos/no patológicos, antecedentes
--     odontológicos) — se agregan a HISTORIA_CLINICA_CAMPOS igual que
--     las que ya existían, así entran solas al wizard y al guardado
--     genérico.
--  2) Exploración física/signos vitales y cabeza-cuello-cavidad bucal,
--     que llena la DOCTORA cuando el paciente llega a consulta — nunca
--     se exponen en el link público, solo en el formulario del
--     dashboard.
-- Todo texto libre/identificable queda cifrado (NOM-024), igual que el
-- resto de la tabla; ver HISTORIA_CLINICA_CAMPOS_CIFRABLES.
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS fam_detalle TEXT; -- JSON: [{parentesco, vive, enfermedades}]
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS esquema_vacunacion BOOLEAN;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS otros_antecedentes TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS tipo_alimentacion TEXT; -- vegetariana | vegana | mixta | sin_restricciones
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS cepilla_dientes BOOLEAN;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS cepilla_momento TEXT; -- "manana,tarde,noche"
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS higiene_utiliza TEXT; -- "pasta_dental,hilo_dental,enjuague,cepillo"
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS cepillo_consistencia TEXT; -- suave | mediano | duro
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS bruxismo BOOLEAN;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS ejercicio TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS ultima_consulta_dentista TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS motivo_ultima_consulta TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS ansiedad_dental BOOLEAN;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS ansiedad_dental_descripcion TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS tratamientos_previos TEXT; -- "ortodoncia,endodoncia,cirugia,protesis,implantes,periodoncia"
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS traumatismos_dentales BOOLEAN;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS traumatismos_dentales_cual TEXT;

-- Exploración física y signos vitales — solo doctora.
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS ta TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS fc TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS fr TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS temperatura TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS peso_exploracion TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS talla TEXT;

-- Cabeza, cuello y cavidad bucal — solo doctora.
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS cabeza_cara_normal BOOLEAN;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS cabeza_cara_hallazgos TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS atm TEXT; -- "normal,dolor,chasquidos,crepitacion,limitaciones"
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS ganglios_cuello_normal BOOLEAN;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS ganglios_cuello_hallazgos TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS labios_mucosa_normal BOOLEAN;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS labios_mucosa_hallazgos TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS lengua_piso_boca_normal BOOLEAN;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS lengua_piso_boca_hallazgos TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS paladar_orofaringe_normal BOOLEAN;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS paladar_orofaringe_hallazgos TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS encia_periodonto TEXT; -- "normal,gingivitis,periodontitis,recesion,movilidad"

-- Dibujo libre sobre la carta del odontograma (trazos, líneas, símbolos
-- y abreviaturas en el recuadro de cada pieza, según la simbología de
-- la doctora). Igual que historia_clinica, nunca se sobrescribe: cada
-- guardado inserta una versión nueva y se lee la más reciente. El
-- contenido va cifrado (NOM-024) porque es información clínica.
CREATE TABLE IF NOT EXISTS odontograma_dibujos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  datos TEXT NOT NULL,
  creado_por_nombre VARCHAR(160),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_odontograma_dibujos_paciente ON odontograma_dibujos(paciente_id, id DESC);

-- Puntos de lealtad por completar la historia clínica en línea: se
-- otorgan una sola vez por paciente.
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS historia_puntos_otorgados BOOLEAN NOT NULL DEFAULT false;

-- Presupuestos: conceptos que se cobran por diente y plan de pagos de
-- ortodoncia (pago inicial + mensualidades).
ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS por_diente BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS pago_inicial NUMERIC(12,2);
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS mensualidades INTEGER;

-- Tratamientos que la doctora escribe a mano al agendar; se suman a la
-- lista fija (TRATAMIENTOS) y quedan guardados para la próxima vez.
CREATE TABLE IF NOT EXISTS tratamientos_personalizados (
  nombre VARCHAR(120) PRIMARY KEY,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pantalla de TV de la sala de espera: una sola fila (id = 1) con lo que
-- se muestra ahora. Solo se guarda el nombre de pila para no exponer datos.
CREATE TABLE IF NOT EXISTS pantalla_tv (
  id INTEGER PRIMARY KEY DEFAULT 1,
  modo VARCHAR(12) NOT NULL DEFAULT 'espera',
  -- 'espera' | 'bienvenida' | 'gracias'
  nombre VARCHAR(80),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Brackets: cuota inicial + monto por cada ajuste o mantenimiento
-- (mensualidades pasa a ser el número de ajustes, opcional).
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS monto_ajuste NUMERIC(12,2);

-- Hora de la cita que se muestra en la TV (texto "HH:MM").
ALTER TABLE pantalla_tv ADD COLUMN IF NOT EXISTS hora VARCHAR(8);

-- Plan de tratamiento por etapas: cada concepto puede llevar etapa y
-- porcentaje de descuento.
ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS etapa VARCHAR(120);
ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS descuento NUMERIC(5,2) NOT NULL DEFAULT 0;

-- Firma dibujada por el paciente al aprobar el presupuesto (PNG en data URL).
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS firma_paciente TEXT;

-- Límite de uso de las rutas públicas (agendar, aprobar presupuesto,
-- formularios): cuántas veces llamó cada IP a cada acción en la ventana
-- actual. Vive en la base para que sobreviva un reinicio del servidor.
CREATE TABLE IF NOT EXISTS limites_publicos (
  clave VARCHAR(200) PRIMARY KEY,
  ventana_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  conteo INTEGER NOT NULL DEFAULT 0
);

-- Cuándo aceptó el paciente el aviso de privacidad (LFPDPPP), desde el
-- link para agendar o el formulario de historia clínica.
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS aviso_privacidad_aceptado_en TIMESTAMPTZ;

-- Fotos clínicas del paciente (antes / durante / después). La imagen y su
-- miniatura se guardan como data URL cifrada (NOM-024). No se borran: se
-- marcan vigente=false con el motivo, igual que las notas clínicas.
CREATE TABLE IF NOT EXISTS paciente_fotos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  etapa VARCHAR(20) NOT NULL DEFAULT 'otra',
  -- 'antes' | 'durante' | 'despues' | 'otra'
  nota TEXT,
  imagen TEXT NOT NULL,
  miniatura TEXT NOT NULL,
  tomada_en DATE NOT NULL DEFAULT CURRENT_DATE,
  subida_por_nombre VARCHAR(160),
  vigente BOOLEAN NOT NULL DEFAULT true,
  motivo_anulacion TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS paciente_fotos_paciente_idx ON paciente_fotos (paciente_id);

-- El link del paciente (historia clínica + portal) caduca 90 días después
-- de la última vez que la clínica lo compartió o lo regeneró.
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS historial_token_expira_en TIMESTAMPTZ DEFAULT (now() + interval '90 days');
UPDATE pacientes SET historial_token_expira_en = now() + interval '90 days' WHERE historial_token_expira_en IS NULL;

-- Versión de las TVs vinculadas: subirla invalida todas las claves de TV.
ALTER TABLE pantalla_tv ADD COLUMN IF NOT EXISTS tv_version INTEGER NOT NULL DEFAULT 1;
INSERT INTO pantalla_tv (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Revocación de sesiones: toda sesión emitida antes de estas fechas deja
-- de valer ("Cerrar todas las sesiones", o al borrar/cambiar un usuario).
CREATE TABLE IF NOT EXISTS seguridad (
  id INTEGER PRIMARY KEY DEFAULT 1,
  sesiones_validas_desde TIMESTAMPTZ NOT NULL DEFAULT 'epoch'
);
INSERT INTO seguridad (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sesiones_validas_desde TIMESTAMPTZ NOT NULL DEFAULT 'epoch';

-- Verificación en dos pasos (código de 6 dígitos, TOTP). El secreto se
-- guarda cifrado. La cuenta admin de variables de entorno no tiene fila en
-- `usuarios`, así que el suyo vive en `seguridad`.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_secreto TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_pendiente TEXT;
ALTER TABLE seguridad ADD COLUMN IF NOT EXISTS admin_totp_secreto TEXT;
ALTER TABLE seguridad ADD COLUMN IF NOT EXISTS admin_totp_pendiente TEXT;
