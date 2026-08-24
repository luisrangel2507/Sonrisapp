function IconoDienteCarga({ delay }: { delay: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 animate-bounce fill-white drop-shadow-md" style={{ animationDelay: delay }}>
      <path d="M12 2.2c-2.6 0-4.6 1.8-4.6 4.6 0 1.2.3 2.3.8 3.5.6 1.3.9 2.7 1.1 4.8.2 2.2.5 4.4 1 6.1.3 1 .9 1.6 1.5 1.6.8 0 1.2-.8 1.4-2.3.2-1.7.4-3.1.8-3.1s.6 1.4.8 3.1c.2 1.5.6 2.3 1.4 2.3.6 0 1.2-.6 1.5-1.6.5-1.7.8-3.9 1-6.1.2-2.1.5-3.5 1.1-4.8.5-1.2.8-2.3.8-3.5 0-2.8-2-4.6-4.6-4.6-1 0-1.7.3-2.5.8-.3.2-.6.2-1 0-.8-.5-1.5-.8-2.5-.8Z" />
    </svg>
  );
}

export function PantallaCarga() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-cover bg-center px-6 pb-16 [background-image:url('/loading-bg.jpg')] md:[background-image:url('/loading-bg-desktop.jpg')]"
      style={{ backgroundColor: "#160a10" }}
    >
      <div className="flex flex-col items-center gap-3 rounded-full bg-black/30 px-7 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <IconoDienteCarga delay="-0.3s" />
          <IconoDienteCarga delay="-0.15s" />
          <IconoDienteCarga delay="0s" />
        </div>
        <p
          className="text-[13px] font-semibold uppercase tracking-[0.3em] text-white drop-shadow-lg"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Cargando…
        </p>
      </div>
    </div>
  );
}
