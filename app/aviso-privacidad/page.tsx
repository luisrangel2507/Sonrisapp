import type { Metadata } from "next";
import { CLINICA, DOCTORA } from "@/lib/panel-data";

export const metadata: Metadata = { title: "Aviso de privacidad — Viña Sonrisas" };

// Aviso de privacidad integral (Ley Federal de Protección de Datos
// Personales en Posesión de los Particulares). Público: se enlaza desde
// el link para agendar y desde el formulario de historia clínica.
export default function AvisoPrivacidad() {
  const seccion = "mt-6 text-[15px] font-semibold text-[#7A1E33]";
  const parrafo = "mt-2 text-[14px] leading-relaxed text-[#4a4038]";
  return (
    <main className="min-h-dvh bg-[#F5F1EA] px-5 py-10">
      <article className="mx-auto max-w-2xl rounded-3xl border border-[#EFE9DC] bg-white/80 p-6 shadow-sm md:p-10">
        <h1 className="font-serif text-2xl font-semibold text-[#2b2118]">Aviso de privacidad integral</h1>
        <p className="mt-1 text-[12px] text-[#a49c8a]">Viña Sonrisas · Odontología Estética</p>

        <h2 className={seccion}>Responsable</h2>
        <p className={parrafo}>
          {DOCTORA.nombre}, cédula profesional {DOCTORA.cedula}, con domicilio en {CLINICA.direccion}, Querétaro,
          México, es responsable del uso y protección de sus datos personales.
        </p>

        <h2 className={seccion}>Datos que recabamos</h2>
        <p className={parrafo}>
          Datos de identificación y contacto (nombre, teléfono, correo, fecha de nacimiento) y datos personales
          sensibles relativos a su estado de salud: antecedentes médicos y dentales, alergias, medicamentos,
          odontograma, fotografías clínicas, diagnósticos, tratamientos, recetas y consentimientos firmados. También
          datos de pago de los servicios recibidos.
        </p>

        <h2 className={seccion}>Finalidades</h2>
        <p className={parrafo}>
          Finalidades necesarias: integrar y conservar su expediente clínico conforme a la NOM-004-SSA3-2012 y la
          NOM-024-SSA3-2012; brindarle atención odontológica; agendar y recordarle sus citas; elaborar presupuestos,
          recetas y comprobantes; y cobrar los servicios.
        </p>
        <p className={parrafo}>
          Finalidades secundarias: enviarle felicitaciones, promociones y avisos de su programa de lealtad. Si no desea
          que sus datos se usen para estas finalidades, indíquelo a la clínica en cualquier momento; esto no afecta su
          atención.
        </p>

        <h2 className={seccion}>Transferencias</h2>
        <p className={parrafo}>
          Sus datos no se venden ni se comparten con terceros, salvo con laboratorios dentales o especialistas que
          participen en su tratamiento, con autoridades sanitarias cuando la ley lo exija, y con los proveedores
          tecnológicos que alojan el sistema y envían los mensajes, quienes están obligados a mantener su
          confidencialidad.
        </p>

        <h2 className={seccion}>Seguridad</h2>
        <p className={parrafo}>
          La información clínica se guarda cifrada, el acceso requiere usuario y contraseña, y cada consulta al
          expediente queda registrada en una bitácora.
        </p>

        <h2 className={seccion}>Derechos ARCO y revocación</h2>
        <p className={parrafo}>
          Usted puede Acceder a sus datos, Rectificarlos, Cancelarlos u Oponerse a su uso, así como revocar su
          consentimiento, presentando su solicitud en la clínica o por los medios de contacto de la misma. Le
          responderemos en un máximo de 20 días hábiles. El expediente clínico se conserva por el tiempo que marca la
          NOM-004-SSA3-2012 (mínimo 5 años), aun si solicita la cancelación.
        </p>

        <h2 className={seccion}>Cambios a este aviso</h2>
        <p className={parrafo}>Cualquier cambio a este aviso se publicará en esta misma página.</p>

        <p className="mt-8 text-[12px] text-[#a49c8a]">Última actualización: octubre de 2026.</p>
      </article>
    </main>
  );
}
