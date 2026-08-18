-- SonrisApp — esquema de base de datos (Postgres / Railway)
-- Corre este archivo completo contra la base antes de desplegar.

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
  ultimo_aviso_meta_en TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS citas (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  tratamiento VARCHAR(160) NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'agendada',
  -- 'agendada' | 'completada' | 'cancelada'
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_paciente_dientes_paciente ON paciente_dientes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_diente_historial_diente ON diente_historial(paciente_diente_id);
