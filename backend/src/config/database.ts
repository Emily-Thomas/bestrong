import path from 'node:path';
import { config } from 'dotenv';
import { Pool, type PoolConfig } from 'pg';

// Load .env file if not already loaded (for when this module is imported directly)
// This ensures environment variables are available
if (!process.env.DB_PASSWORD) {
  const envPath = path.join(__dirname, '../../.env');
  config({ path: envPath });
}

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

// Build config with explicit string conversion
const poolConfig: PoolConfig = {
  host: String(process.env.DB_HOST || 'localhost'),
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: String(process.env.DB_NAME || 'bestrong'),
  user: String(process.env.DB_USER || 'postgres'),
  password: getPassword(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Validate password is a string before creating pool
if (typeof poolConfig.password !== 'string') {
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
