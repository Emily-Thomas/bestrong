import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from 'dotenv';

// Load .env file only if it exists and we're not in Vercel
// In Vercel, environment variables are already set via the dashboard
const envPath = path.join(__dirname, '../.env');
if (!process.env.VERCEL) {
  if (existsSync(envPath)) {
    config({ path: envPath });
  } else {
    console.log('ℹ️  No .env file found, using environment variables from system');
  }
}

// Debug: Log available environment variables (without sensitive data)
console.log('🔍 Environment check:');
console.log('   VERCEL:', process.env.VERCEL ? 'true' : 'false');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '***set***' : 'not set');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '***set***' : 'not set');
console.log('   POSTGRES_URL:', process.env.POSTGRES_URL ? '***set***' : 'not set');
console.log('   POSTGRES_PRISMA_URL:', process.env.POSTGRES_PRISMA_URL ? '***set***' : 'not set');
console.log('   POSTGRES_URL_NON_POOLING:', process.env.POSTGRES_URL_NON_POOLING ? '***set***' : 'not set');
console.log('   DB_HOST:', process.env.DB_HOST || 'not set');
console.log('   DB_NAME:', process.env.DB_NAME || 'not set');
console.log('   DB_USER:', process.env.DB_USER || 'not set');
console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***set***' : 'not set');
console.log('');

// Support Supabase and other PostgreSQL connection strings
// Supabase provides DATABASE_URL or SUPABASE_URL
// Also support POSTGRES_URL for backward compatibility
const databaseUrl = 
  process.env.DATABASE_URL || 
  process.env.SUPABASE_URL || 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL_NON_POOLING;
if (!databaseUrl) {
  // Validate required environment variables for non-connection-string deployments
  const requiredVars = {
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value || value === '')
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error(
      '\n   For Supabase deployments:'
    );
    console.error(
      '   1. Create a Supabase project at https://supabase.com'
    );
    console.error(
      '   2. Go to Project Settings → Database'
    );
    console.error(
      '   3. Copy the connection string (URI format)'
    );
    console.error(
      '   4. Set DATABASE_URL or SUPABASE_URL in Vercel project settings'
    );
    console.error(
      '\n   For other PostgreSQL databases:'
    );
    console.error(
      '   Set DATABASE_URL or POSTGRES_URL in Vercel project settings'
    );
    console.error(
      '   For local development, check your .env file at:',
      envPath
    );
    process.exit(1);
  }
} else {
  const isSupabase = databaseUrl.includes('supabase.co');
  if (isSupabase) {
    console.log('✅ Supabase connection string found, will use it');
  } else {
    console.log('✅ Database connection string found, will use it');
  }
}

// Now import modules that depend on environment variables
import { runMigrations, testConnection } from '../src/db/migrations';

async function main() {
  console.log('🔄 Running database migrations...\n');
  
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (databaseUrl) {
    const isSupabase = databaseUrl.includes('supabase.co');
    if (isSupabase) {
      console.log('   Using Supabase connection string');
    } else {
      console.log('   Using PostgreSQL connection string');
    }
  } else {
    console.log(
      `   Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`
    );
    console.log(`   User: ${process.env.DB_USER}\n`);
  }

  try {
    const connected = await testConnection();
    if (!connected) {
      console.error(
        '❌ Cannot connect to database. Please check your environment variables.'
      );
      process.exit(1);
    }

    await runMigrations();
    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  }
}

main();

