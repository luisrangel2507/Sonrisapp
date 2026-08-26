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
};

export default nextConfig;
