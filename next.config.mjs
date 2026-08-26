/** @type {import('next').NextConfig} */
const nextConfig = {
  // Habilita instrumentation.ts — aplica db/schema.sql al arrancar el
  // servidor, para que un cambio de esquema nunca dependa de correrlo
  // a mano contra producción.
  experimental: {
    instrumentationHook: true,
    // instrumentation.ts se compila también para el runtime edge; sin
    // esto, webpack intenta empaquetar "pg" (que usa fs/path/stream de
    // Node) para ese bundle y el build falla, aunque en tiempo de
    // ejecución esa rama nunca corre en edge (ver el guard en
    // instrumentation.ts).
    serverComponentsExternalPackages: ["pg", "pg-native", "pgpass"],
  },
  // Refuerza que la página solo se sirva por HTTPS (Railway ya termina
  // TLS, esto lo hace explícito a nivel de app) y algunos headers de
  // seguridad básicos — parte del cifrado exigido por NOM-024-SSA3-2012.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
