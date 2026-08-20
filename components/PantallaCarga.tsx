export function PantallaCarga() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-cover bg-center px-6"
      style={{ backgroundColor: "#160a10", backgroundImage: "url('/loading-bg.jpg')" }}
    >
      <p className="text-[15px] font-medium tracking-wide text-white drop-shadow-lg">Cargando…</p>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-white" />
      </div>
    </div>
  );
}
