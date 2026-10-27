import { NextRequest } from "next/server";
import { asegurarHistorialToken } from "@/lib/historial-token";
import { PARENTESCOS_FAMILIA, PASOS, type FamiliarDetalle, type Paso } from "@/lib/historia-clinica-pasos";
import { apiInterna, esc, identidadLigera, irA, pagina } from "@/lib/ligera";

export const dynamic = "force-dynamic";

type Datos = Record<string, unknown>;

const FRECUENCIAS = [
  { valor: "si", label: "Sí" },
  { valor: "a_veces", label: "A veces" },
  { valor: "no", label: "No" },
];

function radios(nombre: string, opciones: { valor: string; label: string }[], actual: unknown) {
  return opciones
    .map(
      (o) =>
        `<label style="display:inline-block;text-transform:none;font-size:17px;color:#2b2118;font-weight:normal;margin:4px 16px 8px 0">
          <input type="radio" name="${nombre}" value="${esc(o.valor)}" style="width:auto;margin-right:6px"${String(actual) === o.valor ? " checked" : ""}>${esc(o.label)}</label>`
    )
    .join("");
}

function boolActual(v: unknown) {
  return v === true ? "si" : v === false ? "no" : "";
}

const SI_NO = [
  { valor: "si", label: "Sí" },
  { valor: "no", label: "No" },
];

function texto(nombre: string, valor: unknown, tipo = "text", placeholder = "") {
  return `<input type="${tipo}" name="${nombre}" value="${esc(valor ?? "")}" placeholder="${esc(placeholder)}">`;
}

function campo(paso: Paso, h: Datos, p: Datos, fam: FamiliarDetalle[]): string {
  const k = paso.key as string;
  switch (paso.tipo) {
    case "texto":
      return texto(k, h[k]);
    case "bool":
      return radios(k, SI_NO, boolActual(h[k]));
    case "sexo":
      return radios("sexo", [
        { valor: "F", label: "Femenino" },
        { valor: "M", label: "Masculino" },
      ], h.sexo);
    case "fecha_nacimiento":
      return texto("fecha_nacimiento", typeof p.fecha_nacimiento === "string" ? p.fecha_nacimiento.slice(0, 10) : "", "date");
    case "paciente_texto":
      return texto(k, p[k], paso.inputType ?? "text");
    case "paciente_bool":
      return radios(k, SI_NO, boolActual(p[k]));
    case "emergencia":
      return (
        texto("emergencia_nombre", h.emergencia_nombre, "text", "Nombre") +
        texto("emergencia_telefono", h.emergencia_telefono, "tel", "Teléfono") +
        texto("emergencia_parentesco", h.emergencia_parentesco, "text", "Parentesco")
      );
    case "domicilio":
      return (
        texto("domicilio", h.domicilio, "text", "Calle y número, colonia") +
        texto("codigo_postal", h.codigo_postal, "text", "Código postal") +
        texto("ciudad", h.ciudad, "text", "Ciudad") +
        texto("estado", h.estado, "text", "Estado") +
        texto("pais", h.pais, "text", "País")
      );
    case "frecuencia":
      return radios(k, FRECUENCIAS, h[k]);
    case "familiares":
      return (paso.parentescos ?? [])
        .map((par) => {
          const f = fam.find((x) => x.parentesco === par);
          const vive = f?.no_aplica ? "na" : f?.vive === true ? "si" : f?.vive === false ? "no" : "";
          const id = `fam_${(PARENTESCOS_FAMILIA as readonly string[]).indexOf(par)}`;
          return `<div style="margin:6px 0 10px"><b>${esc(par)}</b><br>
            ${radios(`${id}_vive`, [
              { valor: "si", label: "Vive" },
              { valor: "no", label: "Falleció" },
              { valor: "na", label: "No aplica" },
            ], vive)}
            ${texto(`${id}_enf`, f?.enfermedades, "text", "Enfermedades (si tiene)")}</div>`;
        })
        .join("");
    case "opciones":
      if (k === "esquema_vacunacion") {
        return radios(k, paso.opciones, h.esquema_vacunacion === true ? "completo" : h.esquema_vacunacion === false ? "incompleto" : "");
      }
      return radios(k, paso.opciones, h[k]);
    case "multi": {
      const actuales = typeof h[k] === "string" ? (h[k] as string).split(",") : [];
      return paso.opciones
        .map(
          (o) =>
            `<label style="display:inline-block;text-transform:none;font-size:17px;color:#2b2118;font-weight:normal;margin:4px 16px 8px 0">
              <input type="checkbox" name="${k}" value="${esc(o.valor)}" style="width:auto;margin-right:6px"${actuales.includes(o.valor) ? " checked" : ""}>${esc(o.label)}</label>`
        )
        .join("");
    }
  }
}

async function cargar(req: NextRequest, token: string) {
  const r = await apiInterna(req, `/api/formulario/${token}`);
  if (!r.ok) return null;
  return (await r.json()) as { paciente: Datos & { nombre: string }; historiaClinica: Datos | null };
}

// Formulario de historia clínica en una sola página, para que el paciente
// lo llene en el iPad del consultorio. Guarda igual que el link del
// paciente: queda como auto-reporte pendiente de que la doctora lo revise.
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!(await identidadLigera(req))) return irA(req, "/ligera");
  const id = Number((await props.params).id);
  const token = await asegurarHistorialToken(id).catch(() => null);
  const datos = token ? await cargar(req, token) : null;
  if (!datos) return irA(req, "/ligera/pacientes");

  const h = datos.historiaClinica ?? {};
  const p = datos.paciente;
  let fam: FamiliarDetalle[] = [];
  try {
    fam = typeof h.fam_detalle === "string" ? JSON.parse(h.fam_detalle) : [];
  } catch {
    fam = [];
  }
  const error = req.nextUrl.searchParams.get("error");

  let seccion = "";
  let html = "";
  for (const paso of PASOS) {
    if (paso.seccion !== seccion) {
      if (seccion) html += `</div>`;
      seccion = paso.seccion;
      html += `<div class="tarjeta"><h1 style="font-size:19px;color:#7A1E33">${esc(seccion)}</h1>`;
    }
    const condicional = paso.mostrarSi ? ` <span class="muted" style="text-transform:none;font-weight:normal">(solo si aplica)</span>` : "";
    html += `<div style="margin:12px 0 4px;font-weight:bold">${esc(paso.pregunta)}${condicional}</div>${campo(paso, h, p, fam)}`;
  }
  if (seccion) html += `</div>`;

  return pagina(
    "Historia clínica",
    `<div class="tarjeta"><h1>Historia clínica</h1><p>${esc(p.nombre)}</p>
      <p class="muted">Contesta lo que sepas; puedes dejar en blanco lo que no aplique.</p></div>
    <form method="post" action="/ligera/paciente/${id}/historia">
      ${html}
      <div class="tarjeta">
        ${error ? `<p class="err">${esc(error)}</p>` : ""}
        <label style="text-transform:none;font-size:16px;color:#2b2118;font-weight:normal">
          <input type="checkbox" name="aviso_privacidad" value="si" style="width:auto;margin-right:8px">
          He leído y acepto el <a href="/aviso-privacidad" target="_blank" style="color:#7A1E33">aviso de privacidad</a>
          y autorizo el uso de mis datos de salud para mi atención.
        </label>
        <button class="btn ancho" type="submit" style="margin-top:14px">Mi información es correcta, enviar</button>
      </div>
    </form>`
  );
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!(await identidadLigera(req))) return irA(req, "/ligera");
  const id = Number((await props.params).id);
  const form = await req.formData().catch(() => null);
  if (!form) return irA(req, `/ligera/paciente/${id}/historia`);
  if (form.get("aviso_privacidad") !== "si") {
    return irA(req, `/ligera/paciente/${id}/historia?error=${encodeURIComponent("Marca la casilla del aviso de privacidad para enviar.")}`);
  }

  const token = await asegurarHistorialToken(id);
  const actual = await cargar(req, token);
  const h: Datos = { ...(actual?.historiaClinica ?? {}) };
  const cuerpo: Datos = { ...h };
  const txt = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return v ? v.slice(0, 1000) : null;
  };
  const bool = (k: string) => (form.get(k) === "si" ? true : form.get(k) === "no" ? false : null);

  let fam: FamiliarDetalle[] = [];
  try {
    fam = typeof h.fam_detalle === "string" ? JSON.parse(h.fam_detalle) : [];
  } catch {
    fam = [];
  }

  for (const paso of PASOS) {
    const k = paso.key as string;
    switch (paso.tipo) {
      case "texto":
        cuerpo[k] = txt(k);
        break;
      case "bool":
      case "paciente_bool":
        cuerpo[k] = bool(k);
        break;
      case "sexo":
        cuerpo.sexo = form.get("sexo") === "F" || form.get("sexo") === "M" ? form.get("sexo") : null;
        break;
      case "fecha_nacimiento":
        cuerpo.fecha_nacimiento = txt("fecha_nacimiento");
        break;
      case "paciente_texto":
        cuerpo[k] = txt(k);
        break;
      case "emergencia":
        for (const c of ["emergencia_nombre", "emergencia_telefono", "emergencia_parentesco"]) cuerpo[c] = txt(c);
        break;
      case "domicilio":
        for (const c of ["domicilio", "codigo_postal", "ciudad", "estado", "pais"]) cuerpo[c] = txt(c);
        break;
      case "frecuencia": {
        const v = String(form.get(k) ?? "");
        cuerpo[k] = ["si", "a_veces", "no"].includes(v) ? v : null;
        break;
      }
      case "familiares":
        for (const par of paso.parentescos ?? []) {
          const idf = `fam_${(PARENTESCOS_FAMILIA as readonly string[]).indexOf(par)}`;
          const vive = String(form.get(`${idf}_vive`) ?? "");
          const nuevo: FamiliarDetalle = {
            parentesco: par,
            vive: vive === "si" ? true : vive === "no" ? false : null,
            enfermedades: txt(`${idf}_enf`),
            no_aplica: vive === "na" || undefined,
          };
          fam = [...fam.filter((f) => f.parentesco !== par), nuevo];
        }
        break;
      case "opciones": {
        const v = String(form.get(k) ?? "");
        if (k === "esquema_vacunacion") cuerpo[k] = v === "completo" ? true : v === "incompleto" ? false : null;
        else cuerpo[k] = paso.opciones.some((o) => o.valor === v) ? v : null;
        break;
      }
      case "multi": {
        const vals = form.getAll(k).map(String).filter((v) => paso.opciones.some((o) => o.valor === v));
        cuerpo[k] = vals.length ? vals.join(",") : null;
        break;
      }
    }
  }
  const conDatos = fam.filter((f) => f.vive !== null || f.enfermedades || f.no_aplica || f.si_aplica);
  cuerpo.fam_detalle = conDatos.length ? JSON.stringify(fam) : null;
  cuerpo.aviso_privacidad = true;
  // Fecha de la historia (obligatoria): la que ya tenía, o la de hoy.
  cuerpo.fecha =
    typeof h.fecha === "string" && h.fecha
      ? h.fecha.slice(0, 10)
      : new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

  const r = await apiInterna(req, `/api/formulario/${token}`, "PUT", cuerpo);
  if (!r.ok) {
    return irA(req, `/ligera/paciente/${id}/historia?error=${encodeURIComponent("No se pudo guardar. Revisa los datos e intenta de nuevo.")}`);
  }
  return irA(req, `/ligera/paciente/${id}?aviso=${encodeURIComponent("¡Gracias! La historia clínica quedó guardada.")}`);
}
