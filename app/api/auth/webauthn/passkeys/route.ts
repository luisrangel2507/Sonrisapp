import { NextRequest, NextResponse } from "next/server";
import { listarPasskeys, borrarPasskey } from "@/lib/webauthn-store";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const passkeys = await listarPasskeys();
    return NextResponse.json({ passkeys });
  } catch (err) {
    return errorJson(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    await borrarPasskey(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
