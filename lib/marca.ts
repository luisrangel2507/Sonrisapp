import { query } from "@/lib/db";
import { CLINICA, DOCTORA, TARJETA_DENTISTA } from "@/lib/panel-data";

// Identidad de la clínica (marca blanca). Cada campo puede configurarse
// desde Perfil; cuando está vacío se usa el valor por defecto de Viña
// Sonrisas, de modo que una instalación ya existente no cambia en nada.
export interface Marca {
  clinicaNombre: string;
  clinicaLema: string;
  colorMarca: string;
  logo: string | null;
  doctorNombre: string;
  doctorTitulo: string;
  cedula: string;
  direccion: string;
  horario: string;
  telefono: string | null;
}

export const MARCA_DEFAULT: Marca = {
  clinicaNombre: "Viña Sonrisas",
  clinicaLema: "Odontología Estética",
  colorMarca: "#7A1E33",
  logo: null,
  doctorNombre: DOCTORA.nombre,
  doctorTitulo: TARJETA_DENTISTA.titulo,
  cedula: DOCTORA.cedula,
  direccion: CLINICA.direccion,
  horario: CLINICA.horario,
  telefono: null,
};

const limpio = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

// Lee la marca efectiva desde la base, con respaldo a los valores por
// defecto. Pensada para el servidor (PDF, APIs, páginas públicas).
export async function obtenerMarca(): Promise<Marca> {
  try {
    const { rows } = await query<Record<string, string | null>>(
      `SELECT clinica_nombre, clinica_lema, logo, color_marca, doctor_nombre,
              doctor_titulo, cedula, direccion, horario, telefono
       FROM perfil_dentista WHERE id = 1`
    );
    const r = rows[0] ?? {};
    const color = limpio(r.color_marca);
    return {
      clinicaNombre: limpio(r.clinica_nombre) ?? MARCA_DEFAULT.clinicaNombre,
      clinicaLema: limpio(r.clinica_lema) ?? MARCA_DEFAULT.clinicaLema,
      colorMarca: color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : MARCA_DEFAULT.colorMarca,
      logo: limpio(r.logo),
      doctorNombre: limpio(r.doctor_nombre) ?? MARCA_DEFAULT.doctorNombre,
      doctorTitulo: limpio(r.doctor_titulo) ?? MARCA_DEFAULT.doctorTitulo,
      cedula: limpio(r.cedula) ?? MARCA_DEFAULT.cedula,
      direccion: limpio(r.direccion) ?? MARCA_DEFAULT.direccion,
      horario: limpio(r.horario) ?? MARCA_DEFAULT.horario,
      telefono: limpio(r.telefono),
    };
  } catch {
    return MARCA_DEFAULT;
  }
}
