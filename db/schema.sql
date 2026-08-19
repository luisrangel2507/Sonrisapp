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
  antecedentes_medicos TEXT
);

-- Por si esta base ya corrió una versión anterior de este archivo
-- (antes de que existieran estas columnas):
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS alergias TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS medicamentos TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS antecedentes_medicos TEXT;

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

CREATE TABLE IF NOT EXISTS paciente_dientes (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  numero_fdi SMALLINT NOT NULL CHECK (numero_fdi BETWEEN 11 AND 48),
  estado VARCHAR(20) NOT NULL DEFAULT 'sano',
  -- 'sano' | 'observacion' | 'caries' | 'tratado' | 'extraido'
  UNIQUE (paciente_id, numero_fdi)
);

CREATE TABLE IF NOT EXISTS diente_historial (
  id SERIAL PRIMARY KEY,
  paciente_diente_id INTEGER REFERENCES paciente_dientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo VARCHAR(80) NOT NULL, -- 'Resina', 'Limpieza', 'Endodoncia'...
  nota TEXT,
  creado_por INTEGER -- id del doctor
);

-- Historial clínico general del paciente (consultas, diagnósticos, notas)
-- — separado del historial por diente en diente_historial.
CREATE TABLE IF NOT EXISTS paciente_notas (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo VARCHAR(80) NOT NULL, -- 'Consulta', 'Diagnóstico', 'Nota general'...
  nota TEXT,
  creado_por INTEGER -- id del doctor
);

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
  enfermedad_actual TEXT,
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

-- Precio por defecto de cada servicio (configurable en el perfil del
-- dentista) — se usa para autorrellenar el monto al agendar.
CREATE TABLE IF NOT EXISTS precios_servicios (
  servicio VARCHAR(120) PRIMARY KEY,
  precio NUMERIC(10,2)
);

CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_paciente_dientes_paciente ON paciente_dientes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_diente_historial_diente ON diente_historial(paciente_diente_id);
CREATE INDEX IF NOT EXISTS idx_paciente_notas_paciente ON paciente_notas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_cita ON pagos(cita_id);
CREATE INDEX IF NOT EXISTS idx_pagos_paciente ON pagos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_historia_clinica_paciente ON historia_clinica(paciente_id);
