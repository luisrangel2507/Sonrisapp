export function Hero() {
  return (
    <div className="relative mx-4 overflow-hidden rounded-[28px]" style={{ height: 220 }}>
      <svg viewBox="0 0 400 220" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b3a52" />
            <stop offset="45%" stopColor="#c96f3b" />
            <stop offset="75%" stopColor="#f0a868" />
            <stop offset="100%" stopColor="#fbdcb8" />
          </linearGradient>
          <radialGradient id="sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff6e0" />
            <stop offset="100%" stopColor="#ffcf7a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="220" fill="url(#sky)" />
        <circle cx="130" cy="150" r="70" fill="url(#sun)" />
        <circle cx="130" cy="150" r="26" fill="#fff3d6" />
        <path d="M0 190 Q80 165 160 185 T400 175 V220 H0 Z" fill="#1f2a3d" opacity="0.55" />
        <path d="M0 205 Q100 185 220 205 T400 195 V220 H0 Z" fill="#161d2c" opacity="0.7" />
        <g transform="translate(255,95)">
          <path
            d="M35 0C20 0 12 8 8 8C4 8 -4 0 -18 0C-34 0 -40 14 -38 30C-36 48 -22 55 -18 78C-15 96 -8 108 0 108C8 108 8 88 8 78C8 68 10 64 15 64C20 64 22 68 22 78C22 88 22 108 30 108C38 108 45 96 48 78C52 55 66 48 68 30C70 14 51 0 35 0Z"
            fill="#fdf6ea"
            opacity="0.95"
          />
          <path d="M6 4C-2 -10 -22 -12 -30 -2C-22 6 -8 8 6 4Z" fill="#7fae6e" />
          <path d="M18 2C24 -14 42 -18 52 -8C44 2 30 6 18 2Z" fill="#9bc98a" />
        </g>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
      <p className="absolute bottom-5 left-5 right-5 text-lg font-medium text-white drop-shadow-sm">
        Cada paciente que no se te va, es uno que sigue creciendo contigo.
      </p>
    </div>
  );
}
