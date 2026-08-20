export default function DashboardLoading() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cover bg-center px-6"
      style={{ backgroundColor: "#160a10", backgroundImage: "url('/loading-bg.jpg')" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-vina-sonrisas.png" alt="Viña Sonrisas" className="h-auto w-52 drop-shadow-lg" />
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-white" />
      </div>
    </div>
  );
}
