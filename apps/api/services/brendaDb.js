import pg from 'pg';
const { Pool } = pg;

export const brendaPool = new Pool({
  connectionString: process.env.BRENDA_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
