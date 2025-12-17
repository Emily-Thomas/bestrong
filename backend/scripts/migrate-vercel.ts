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

// Support Vercel Postgres connection string
// Vercel Postgres provides POSTGRES_URL
if (!process.env.POSTGRES_URL) {
  // Validate required environment variables for non-Vercel deployments
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
      '\n   For Vercel deployments, set POSTGRES_URL environment variable.'
    );
    console.error(
      '   For local development, check your .env file at:',
      envPath
    );
    process.exit(1);
  }
}

// Now import modules that depend on environment variables
import { runMigrations, testConnection } from '../src/db/migrations';

async function main() {
  console.log('🔄 Running database migrations...\n');
  
  if (process.env.POSTGRES_URL) {
    console.log('   Using Vercel Postgres connection string');
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

