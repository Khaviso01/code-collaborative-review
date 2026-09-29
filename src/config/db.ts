
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// pulling values from .env file
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'code_review_platform',
});

// Logging clear message if database fails
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

export default pool;
