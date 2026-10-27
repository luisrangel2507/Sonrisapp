import { NextRequest } from "next/server";
import { autenticar, ponerCookieSesion } from "@/lib/autenticar";
import { limitarPublico } from "@/lib/limite-publico";
import { irA } from "@/lib/ligera";

export async function POST(req: NextRequest) {
  const limitado = await limitarPublico(req, "login", 30, 15, 10_000);
  if (limitado) return irA(req, `/ligera?error=${encodeURIComponent("Demasiados intentos. Espera unos minutos.")}`);
  const form = await req.formData().catch(() => null);
  const usuario = form?.get("usuario");
  const r = await autenticar(req, usuario, form?.get("contrasena"), form?.get("codigo") || undefined);
  if (!r.ok) {
    const u = typeof usuario === "string" ? usuario : "";
    return irA(req, `/ligera?error=${encodeURIComponent(r.error)}&u=${encodeURIComponent(u)}${r.requiereCodigo ? "&codigo=1" : ""}`);
  }
  const res = irA(req, "/ligera");
  await ponerCookieSesion(res, r.identidad);
  return res;
}
