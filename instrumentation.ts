// Aplica db/schema.sql contra la base cada vez que arranca el
// servidor — así un cambio de esquema nunca se queda "solo en el
// repo" esperando a que alguien lo corra a mano contra producción.
// Es seguro: el archivo entero es idempotente (CREATE TABLE IF NOT
// EXISTS, ADD COLUMN IF NOT EXISTS, bloques DO $$ que primero
// revisan si ya se aplicaron). Si algo sale mal, se registra el
// error pero el servidor sigue arrancando — no queremos que un
// problema de migración tumbe toda la app.
//
// La lógica vive en instrumentation-node.ts (import dinámico) porque
// este archivo también se compila para el runtime edge, y ese runtime
// no puede resolver los módulos de Node que usa "pg" (fs/net/dns...).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { aplicarSchema } = await import("./instrumentation-node");
    await aplicarSchema();
  }
}
