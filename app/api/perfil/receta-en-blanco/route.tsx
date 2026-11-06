import { NextRequest, NextResponse } from "next/server";
import { Document, Page, Image, View, Text, renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Receta en blanco: solo el membrete de la doctora, para imprimir y llenar
// a mano. ?formato=carta → hoja carta con dos recetas (media carta cada
// una) y una línea punteada al centro para recortar.
export async function GET(req: NextRequest) {
  try {
    const imagen = path.join(process.cwd(), "public", "receta-membrete.jpg");
    const carta = req.nextUrl.searchParams.get("formato") === "carta";
    const membrete = (top: number) => (
      <Image src={imagen} style={{ position: "absolute", top, left: 0, width: 612, height: 396 }} />
    );
    const buffer = await renderToBuffer(
      <Document title="Receta en blanco">
        {carta ? (
          <Page size="LETTER">
            {membrete(0)}
            {membrete(396)}
            <View style={{ position: "absolute", top: 396, left: 0, width: 612, borderTopWidth: 0.6, borderTopColor: "#9a8f80", borderStyle: "dashed" }} />
            <Text style={{ position: "absolute", top: 390, left: 8, fontSize: 7, color: "#9a8f80", backgroundColor: "#ffffff" }}>✂</Text>
          </Page>
        ) : (
          <Page size={[612, 396]}>{membrete(0)}</Page>
        )}
      </Document>
    );
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receta-en-blanco${carta ? "-carta" : ""}.pdf"`,
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
