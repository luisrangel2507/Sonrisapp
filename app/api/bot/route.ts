import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/panel-data";

interface BotMessage {
  role: "user" | "assistant";
  text: string;
}

// Proxy server-side al API de Claude — la API key nunca se expone al navegador.
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 501 });
  }

  const { messages } = (await req.json()) as { messages: BotMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages es requerido" }, { status: 400 });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.text })),
    }),
  });

  if (!response.ok) {
    const detalle = await response.text();
    return NextResponse.json({ error: detalle }, { status: response.status });
  }

  const data = await response.json();
  const texto = data.content?.find((c: { type: string }) => c.type === "text")?.text
    ?? "¿Puedes repetir tu pregunta?";

  return NextResponse.json({ texto });
}
