import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
export const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE
});