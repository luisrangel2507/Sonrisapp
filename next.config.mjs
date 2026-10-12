/** @type {import('next').NextConfig} */
const nextConfig = {
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
        ],
      },
    ];
  },
};

export default nextConfig;
