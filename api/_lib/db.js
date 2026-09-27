import pg from 'pg';

const { Pool } = pg;

if (!globalThis._pool) {
  globalThis._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    ssl: { rejectUnauthorized: false },
  });
}

export function query(text, params) {
  return globalThis._pool.query(text, params);
}
