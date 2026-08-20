import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorJson } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys } = body ?? {};

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "endpoint es requerido" }, { status: 400 });
    }
    if (!keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "keys.p256dh y keys.auth son requeridos" }, { status: 400 });
    }

    await query(
      `INSERT INTO push_subscripciones (endpoint, p256dh, auth)
       VALUES ($1, $2, $3)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = $2, auth = $3`,
      [endpoint, keys.p256dh, keys.auth]
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return errorJson(err);
  }
}
