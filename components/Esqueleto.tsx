// Marcador de carga: bloques grises con pulso suave que ocupan el lugar
// del contenido, en vez de un "Cargando…" que luego empuja todo hacia abajo.
export function Esqueleto({ filas = 3, alto = "h-20" }: { filas?: number; alto?: string }) {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className={`${alto} animate-pulse rounded-2xl bg-[#EFE9DC]/70`} />
      ))}
    </div>
  );
}
