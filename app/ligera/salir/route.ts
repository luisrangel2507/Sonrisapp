import { NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/auth";
import { irA } from "@/lib/ligera";

export async function POST(req: NextRequest) {
  const res = irA(req, "/ligera");
  res.cookies.delete(COOKIE_SESION);
  return res;
}
