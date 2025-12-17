import path from 'node:path';
import { config } from 'dotenv';

// Load .env file explicitly BEFORE importing anything that uses it
const envPath = path.join(__dirname, '../.env');
const result = config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error.message);
  console.error(`   Expected location: ${envPath}`);
  process.exit(1);
}

// Validate required environment variables (Supabase standard format)
// Support both connection string and individual parameters
const hasConnectionString = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
const requiredVars = hasConnectionString ? {} : {
  POSTGRES_HOST: process.env.POSTGRES_HOST,
  POSTGRES_DATABASE: process.env.POSTGRES_DATABASE,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
};

const missingVars = Object.entries(requiredVars)
  .filter(([_, value]) => !value || value === '')
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error(`\n   Please check your .env file at: ${envPath}`);
  process.exit(1);
}

// Now import modules that depend on environment variables
import { runMigrations, testConnection } from '../src/db/migrations';

async function main() {
  console.log('🔄 Running database migrations...\n');
  const databaseUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (databaseUrl) {
    console.log('   Using connection string');
  } else {
    console.log(
      `   Database: ${process.env.POSTGRES_DATABASE}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || '5432'}`
    );
    console.log(`   User: ${process.env.POSTGRES_USER}\n`);
  }

  try {
    const connected = await testConnection();
    if (!connected) {
      console.error(
        '❌ Cannot connect to database. Please check your .env file.'
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
