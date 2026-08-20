import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// La llave pública VAPID se manda desde el servidor en vez de vivir en
// una variable NEXT_PUBLIC_* — así el navegador siempre recibe el valor
// configurado en Railway, sin depender de que esa variable haya estado
// presente durante el build.
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}
