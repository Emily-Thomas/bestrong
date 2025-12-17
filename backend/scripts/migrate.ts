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

// Validate required environment variables
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
  console.error(`\n   Please check your .env file at: ${envPath}`);
  process.exit(1);
}

// Now import modules that depend on environment variables
import { runMigrations, testConnection } from '../src/db/migrations';

async function main() {
  console.log('🔄 Running database migrations...\n');
  console.log(
    `   Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`
  );
  console.log(`   User: ${process.env.DB_USER}\n`);

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
