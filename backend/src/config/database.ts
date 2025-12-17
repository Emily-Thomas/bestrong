import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from 'dotenv';
import { Pool, type PoolConfig } from 'pg';

// Load .env file only if it exists and we're not in Vercel
// In Vercel, environment variables are already set via the dashboard
// Never try to load .env in Vercel environment (VERCEL env var is automatically set)
if (!process.env.VERCEL && !process.env.VERCEL_ENV) {
  // Only try to load .env if we don't have database connection info
  if (!process.env.POSTGRES_URL && !process.env.DB_PASSWORD) {
    const envPath = path.join(__dirname, '../../.env');
    if (existsSync(envPath)) {
      const result = config({ path: envPath });
      // Don't throw error if .env doesn't exist - just log
      if (result.error) {
        const error = result.error as NodeJS.ErrnoException;
        if (error.code !== 'ENOENT') {
          console.warn('⚠️  Warning loading .env file:', result.error.message);
        }
      }
    }
  }
}

// Support Vercel Postgres connection string
// Vercel Postgres provides POSTGRES_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL_NON_POOLING
const getPoolConfig = (): PoolConfig => {
  // If Vercel Postgres URL is provided, use it directly
  if (process.env.POSTGRES_URL) {
    return {
      connectionString: process.env.POSTGRES_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.POSTGRES_URL.includes('vercel-storage.com') 
        ? { rejectUnauthorized: false }
        : undefined,
    };
  }

  // Fallback to individual connection parameters
  // Ensure password is always a string (PostgreSQL requires this)
  const getPassword = (): string => {
    const password = process.env.DB_PASSWORD;
    if (password === undefined || password === null) {
      console.warn('⚠️  DB_PASSWORD is not set, using empty string');
      return '';
    }
    // Force to string and trim whitespace
    const passwordStr = String(password).trim();
    if (passwordStr === '') {
      console.warn('⚠️  DB_PASSWORD is empty string');
    }
    return passwordStr;
  };

  return {
    host: String(process.env.DB_HOST || 'localhost'),
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: String(process.env.DB_NAME || 'bestrong'),
    user: String(process.env.DB_USER || 'postgres'),
    password: getPassword(),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
};

const poolConfig = getPoolConfig();

// Validate password is a string before creating pool (only for non-connection-string configs)
if (!process.env.POSTGRES_URL && typeof poolConfig.password !== 'string') {
  throw new Error(
    `Database password must be a string, got ${typeof poolConfig.password}`
  );
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
