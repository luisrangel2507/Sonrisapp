import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { endpoint } = body ?? {};

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "endpoint es requerido" }, { status: 400 });
    }

    await query(`DELETE FROM push_subscripciones WHERE endpoint = $1`, [endpoint]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err);
  }
}
