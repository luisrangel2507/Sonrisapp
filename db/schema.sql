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
  alergias TEXT,
  medicamentos TEXT,
  antecedentes_medicos TEXT,
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
-- antecedentes que se llena una vez por paciente (editable después).
CREATE TABLE IF NOT EXISTS historia_clinica (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE UNIQUE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  sexo VARCHAR(1), -- 'F' | 'M'
  nombre_padre_tutor VARCHAR(160),
  domicilio VARCHAR(255),
  ocupacion VARCHAR(120),
  emergencia_nombre VARCHAR(160),
  emergencia_telefono VARCHAR(20),
  motivo_consulta TEXT,
  -- Antecedentes heredofamiliares
  fam_enfermedad_sistemica BOOLEAN,
  fam_enfermedad_cual TEXT,
  -- Antecedentes personales
  enfermedad_actual BOOLEAN,
  enfermedad_actual_cual TEXT,
  toma_medicamento TEXT,
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
  consume_alcohol BOOLEAN,
  consume_tabaco BOOLEAN,
  ets BOOLEAN,
  ets_cual TEXT,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_paciente_dientes_paciente ON paciente_dientes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_diente_historial_diente ON diente_historial(paciente_diente_id);
CREATE INDEX IF NOT EXISTS idx_paciente_notas_paciente ON paciente_notas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_cita ON pagos(cita_id);
CREATE INDEX IF NOT EXISTS idx_pagos_paciente ON pagos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_historia_clinica_paciente ON historia_clinica(paciente_id);
