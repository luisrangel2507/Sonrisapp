import { NextResponse } from "next/server";
import { Document, Page, Image, renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import { errorJson } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Receta en blanco: solo el membrete de la doctora (media carta
// apaisada), para imprimirla y llenarla a mano.
export async function GET() {
  try {
    const imagen = path.join(process.cwd(), "public", "receta-membrete.jpg");
    const buffer = await renderToBuffer(
      <Document title="Receta en blanco">
        <Page size={[612, 396]}>
          <Image src={imagen} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
        </Page>
      </Document>
    );
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="receta-en-blanco.pdf"',
      },
    });
  } catch (err) {
    return errorJson(err);
  }
}
