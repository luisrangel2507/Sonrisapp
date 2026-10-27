const esDev = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${esDev ? " ws: wss:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(esDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // instrumentation.ts se compila también para el runtime edge; sin
  // esto, webpack intenta empaquetar "pg" (que usa fs/path/stream de
  // Node) para ese bundle y el build falla, aunque en tiempo de
  // ejecución esa rama nunca corre en edge (ver el guard en
  // instrumentation.ts).
  serverExternalPackages: ["pg", "pg-native", "pgpass"],
  // Refuerza que la página solo se sirva por HTTPS (Railway ya termina
  // TLS, esto lo hace explícito a nivel de app) y algunos headers de
  // seguridad básicos — parte del cifrado exigido por NOM-024-SSA3-2012.
  async headers() {
    return [
      {
        // Imágenes estáticas de public/ (logo, fondos, odontograma): casi
        // no cambian, el navegador las guarda un día y las revalida en
        // segundo plano en vez de descargarlas en cada visita.
        source: "/:archivo(.*\\.(?:webp|jpg|png))",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Solo se cargan scripts, estilos, imágenes y conexiones de la
          // propia app; nada de terceros. Next necesita 'unsafe-inline'
          // para sus scripts de arranque (y 'unsafe-eval' solo en dev).
          { key: "Content-Security-Policy", value: CSP },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
