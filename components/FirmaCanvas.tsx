"use client";

import { useRef } from "react";
import { Eraser } from "lucide-react";

const ANCHO = 600;
const ALTO = 220;

export function FirmaCanvas({ onCambio }: { onCambio: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const vacio = useRef(true);

  function posicion(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * ANCHO,
      y: ((e.clientY - rect.top) / rect.height) * ALTO,
    };
  }

  function iniciar(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    dibujando.current = true;
    const { x, y } = posicion(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = posicion(e);
    ctx.strokeStyle = "#2b2118";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    vacio.current = false;
  }

  function terminar() {
    if (!dibujando.current) return;
    dibujando.current = false;
    const canvas = canvasRef.current;
    if (canvas && !vacio.current) {
      onCambio(canvas.toDataURL("image/png"));
    }
  }

  function limpiar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, ANCHO, ALTO);
    vacio.current = true;
    onCambio(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={ANCHO}
        height={ALTO}
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerLeave={terminar}
        onPointerCancel={terminar}
        className="w-full touch-none rounded-xl border border-[#EFE9DC] bg-white"
        style={{ aspectRatio: `${ANCHO} / ${ALTO}` }}
      />
      <button
        onClick={limpiar}
        type="button"
        className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[#8a8272]"
      >
        <Eraser size={13} /> Borrar y firmar de nuevo
      </button>
    </div>
  );
}
