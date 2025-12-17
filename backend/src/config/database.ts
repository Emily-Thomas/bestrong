import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from 'dotenv';
import { Pool, type PoolConfig } from 'pg';

// Load .env file only if it exists and we're not in Vercel
// In Vercel, environment variables are already set via the dashboard
// Never try to load .env in Vercel environment (VERCEL env var is automatically set)
if (!process.env.VERCEL && !process.env.VERCEL_ENV) {
  // Only try to load .env if we don't have database connection info
  const hasConnectionString = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!hasConnectionString && !process.env.POSTGRES_PASSWORD) {
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

// Support Supabase PostgreSQL connection strings
// Supabase provides POSTGRES_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL_NON_POOLING
const getPoolConfig = (): PoolConfig => {
  // Check for connection strings (in order of preference - Supabase standard)
  const databaseUrl = 
    process.env.POSTGRES_URL || 
    process.env.POSTGRES_PRISMA_URL || 
    process.env.POSTGRES_URL_NON_POOLING;
  
  // If connection string is provided, use it directly
  if (databaseUrl) {
    const isSupabase = databaseUrl.includes('supabase.co');
    const isVercel = databaseUrl.includes('vercel-storage.com') || databaseUrl.includes('vercel-dbs.com');
    
    if (isSupabase) {
      console.log('📦 Using Supabase connection string');
      console.log('   Configuring SSL to accept self-signed certificates');
    } else if (isVercel) {
      console.log('📦 Using Vercel Postgres connection string');
    } else {
      console.log('📦 Using PostgreSQL connection string');
    }
    
    // For Supabase, parse connection string to ensure SSL is handled correctly
    // Sometimes pg library doesn't respect ssl option with connection strings
    if (isSupabase) {
      try {
        const url = new URL(databaseUrl);
        // Parse connection string and build config explicitly
        return {
          host: url.hostname,
          port: parseInt(url.port || '5432', 10),
          database: url.pathname.slice(1) || 'postgres', // Remove leading /
          user: url.username || 'postgres',
          password: url.password || '',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
          // Supabase requires SSL but uses self-signed certificates
          // Set rejectUnauthorized: false to accept self-signed certificates
          ssl: { rejectUnauthorized: false },
        };
      } catch (error) {
        // If URL parsing fails, fall back to connection string with SSL config
        console.warn('   Could not parse connection string, using as-is with SSL config');
      }
    }
    
    // For non-Supabase or if parsing failed, use connection string with SSL config
    return {
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      // Supabase requires SSL but uses self-signed certificates
      // Set rejectUnauthorized: false to accept self-signed certificates
      ssl: isSupabase
        ? { rejectUnauthorized: false }
        : isVercel
        ? { rejectUnauthorized: false }
        : undefined,
    };
  }
  
  console.log('⚠️  POSTGRES_URL not found, falling back to individual connection parameters');

  // Fallback to individual connection parameters (Supabase standard format)
  // Ensure password is always a string (PostgreSQL requires this)
  const getPassword = (): string => {
    const password = process.env.POSTGRES_PASSWORD;
    if (password === undefined || password === null) {
      console.warn('⚠️  POSTGRES_PASSWORD is not set, using empty string');
      return '';
    }
    // Force to string and trim whitespace
    const passwordStr = String(password).trim();
    if (passwordStr === '') {
      console.warn('⚠️  POSTGRES_PASSWORD is empty string');
    }
    return passwordStr;
  };

  return {
    host: String(process.env.POSTGRES_HOST || 'localhost'),
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: String(process.env.POSTGRES_DATABASE || 'postgres'),
    user: String(process.env.POSTGRES_USER || 'postgres'),
    password: getPassword(),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // Supabase requires SSL for individual connections too
    ssl: process.env.POSTGRES_HOST?.includes('supabase.co')
      ? { rejectUnauthorized: false }
      : undefined,
  };
};

const poolConfig = getPoolConfig();

// Validate password is a string before creating pool (only for non-connection-string configs)
const databaseUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
if (!databaseUrl && typeof poolConfig.password !== 'string') {
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
