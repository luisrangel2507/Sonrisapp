export function Hero() {
  return (
    <div className="relative mx-4 overflow-hidden rounded-[28px]" style={{ height: 220 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-diente-atardecer.jpg"
        alt="Diente descansando en una banca viendo el atardecer"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-black/0" />
      <p className="absolute bottom-5 left-5 right-5 text-lg font-medium text-white drop-shadow-sm">
        Cada paciente que no se te va, es uno que sigue creciendo contigo.
      </p>
    </div>
  );
}
