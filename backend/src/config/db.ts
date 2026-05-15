import pg from 'pg';
import dotenv from 'dotenv';
import dns from 'node:dns';

// Force Node.js to prefer IPv4 over IPv6. Render.com environments often lack IPv6 outbound routing.
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase connection pooling requires SSL in production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Production performance settings
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Prevent the entire app from crashing if a database client has an error
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;