import { Pool, type QueryResultRow } from "pg";

declare global {
  var _pgPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
    // Por defecto pg espera indefinidamente si la base no responde —
    // mejor fallar rápido y claro que dejar la petición colgada.
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
  });
}

// Reutiliza el pool entre hot-reloads en dev y entre invocaciones serverless.
const pool = global._pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") global._pgPool = pool;

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}

export default pool;
