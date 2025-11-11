import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000
});

export async function q<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
  const c = await pool.connect();
  try {
    return await c.query<T>(sql, params);
  } finally {
    c.release();
  }
}
