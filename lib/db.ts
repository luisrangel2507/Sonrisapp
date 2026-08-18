import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
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
