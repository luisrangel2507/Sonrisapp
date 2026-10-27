import { NextRequest } from "next/server";
import { apiInterna, esc, identidadLigera, irA, pagina } from "@/lib/ligera";

export const dynamic = "force-dynamic";

// Firma de consentimiento en el iPad del consultorio (versión ligera). El
// trazo de la firma usa JavaScript sencillo (ES5, eventos touch) que sí
// corre en Safari 12; se manda como imagen igual que la página normal.
const SCRIPT_FIRMA = `
(function(){
  var c=document.getElementById('firma'),x=c.getContext('2d'),dib=false,vacio=true;
  x.lineWidth=2.5;x.lineCap='round';x.lineJoin='round';x.strokeStyle='#2b2118';
  function pos(e){var r=c.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)*c.width/r.width,y:(t.clientY-r.top)*c.height/r.height};}
  function ini(e){e.preventDefault();dib=true;var p=pos(e);x.beginPath();x.moveTo(p.x,p.y);}
  function mov(e){if(!dib)return;e.preventDefault();var p=pos(e);x.lineTo(p.x,p.y);x.stroke();vacio=false;}
  function fin(){dib=false;}
  c.addEventListener('touchstart',ini,false);c.addEventListener('touchmove',mov,false);c.addEventListener('touchend',fin,false);
  c.addEventListener('mousedown',ini,false);c.addEventListener('mousemove',mov,false);window.addEventListener('mouseup',fin,false);
  document.getElementById('borrar').onclick=function(){x.clearRect(0,0,c.width,c.height);vacio=true;};
  document.getElementById('form').onsubmit=function(){
    if(vacio){alert('Firma en el recuadro antes de enviar.');return false;}
    if(!document.getElementById('nombre').value){alert('Escribe tu nombre completo.');return false;}
    document.getElementById('dato').value=c.toDataURL('image/png');return true;
  };
})();`;

export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  if (!(await identidadLigera(req))) return irA(req, "/ligera");
  const token = (await props.params).token;
  const volver = req.nextUrl.searchParams.get("p");
  const r = await apiInterna(req, `/api/consentimiento/${encodeURIComponent(token)}`);
  const d = r.ok ? await r.json() : null;
  const c = d?.consentimiento;
  if (!c) return pagina("Consentimiento", `<div class="tarjeta"><p class="err">Este consentimiento ya no está disponible.</p></div>`);
  const error = req.nextUrl.searchParams.get("error");

  if (c.estado !== "pendiente") {
    return pagina(
      "Consentimiento",
      `<div class="tarjeta"><h1>${esc(c.titulo)}</h1><p class="ok">Ya está firmado por ${esc(c.nombre_firma)}.</p>
       ${volver ? `<a class="btn btn2" href="/ligera/paciente/${esc(volver)}">Volver</a>` : ""}</div>`
    );
  }

  return pagina(
    "Consentimiento",
    `<div class="tarjeta"><h1>${esc(c.titulo)}</h1>
      <div style="white-space:pre-wrap;font-size:16px;line-height:1.5;max-height:55vh;overflow:auto;-webkit-overflow-scrolling:touch;border:1px solid #EFE9DC;border-radius:12px;padding:12px;background:#FBF9F5">${esc(c.contenido)}</div>
    </div>
    <div class="tarjeta">
      ${error ? `<p class="err">${esc(error)}</p>` : ""}
      <form id="form" method="post" action="/ligera/consentimiento/${encodeURIComponent(token)}${volver ? `?p=${esc(volver)}` : ""}">
        <label>Nombre completo de quien firma</label>
        <input id="nombre" name="nombre_firma" value="${esc(c.paciente_nombre)}">
        <label>Firma con el dedo</label>
        <canvas id="firma" width="900" height="300" style="width:100%;height:auto;border:1px solid #EFE9DC;border-radius:12px;background:#fff;touch-action:none"></canvas>
        <button id="borrar" type="button" class="btn btn2">Borrar firma</button>
        <input id="dato" type="hidden" name="firma">
        <button class="btn ancho" type="submit">Firmar y aceptar</button>
      </form>
    </div>
    <script>${SCRIPT_FIRMA}</script>`
  );
}

export async function POST(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  if (!(await identidadLigera(req))) return irA(req, "/ligera");
  const token = (await props.params).token;
  const volver = req.nextUrl.searchParams.get("p");
  const form = await req.formData().catch(() => null);
  const r = await apiInterna(req, `/api/consentimiento/${encodeURIComponent(token)}`, "PUT", {
    nombre_firma: String(form?.get("nombre_firma") ?? "").trim(),
    firma: String(form?.get("firma") ?? ""),
  });
  if (!r.ok) {
    return irA(
      req,
      `/ligera/consentimiento/${encodeURIComponent(token)}?error=${encodeURIComponent("No se pudo guardar la firma. Intenta de nuevo.")}${volver ? `&p=${encodeURIComponent(volver)}` : ""}`
    );
  }
  return irA(req, volver ? `/ligera/paciente/${encodeURIComponent(volver)}?aviso=${encodeURIComponent("¡Gracias! El consentimiento quedó firmado.")}` : "/ligera");
}
