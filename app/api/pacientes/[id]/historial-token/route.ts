import { NextRequest, NextResponse } from "next/server";
import { asegurarHistorialToken } from "@/lib/historial-token";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const token = await asegurarHistorialToken(id);
    return NextResponse.json({ token });
  } catch (err) {
    return errorJson(err);
  }
}
