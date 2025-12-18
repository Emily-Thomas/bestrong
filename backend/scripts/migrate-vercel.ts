import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

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
console.log('   POSTGRES_URL:', process.env.POSTGRES_URL ? '***set***' : 'not set');
console.log('   POSTGRES_PRISMA_URL:', process.env.POSTGRES_PRISMA_URL ? '***set***' : 'not set');
console.log('   POSTGRES_URL_NON_POOLING:', process.env.POSTGRES_URL_NON_POOLING ? '***set***' : 'not set');
console.log('   POSTGRES_HOST:', process.env.POSTGRES_HOST || 'not set');
console.log('   POSTGRES_DATABASE:', process.env.POSTGRES_DATABASE || 'not set');
console.log('   POSTGRES_USER:', process.env.POSTGRES_USER || 'not set');
console.log('   POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? '***set***' : 'not set');
console.log('');

// Support Supabase PostgreSQL connection strings
// Supabase provides POSTGRES_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL_NON_POOLING
const databaseUrl = 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL_NON_POOLING;
if (!databaseUrl) {
  // Validate required environment variables for non-connection-string deployments (Supabase standard)
  const requiredVars = {
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
      '   3. Copy the connection string (POSTGRES_URL) or individual connection parameters'
    );
    console.error(
      '   4. Set POSTGRES_URL (or POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE) in Vercel project settings'
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
import pool from '../src/config/database';

const ADMIN_USERS = [
  {
    email: 'matt@bestrong.com',
    password: 'bestrong',
    name: 'Matt',
  },
  {
    email: 'emily@bestrong.com',
    password: 'bestrong',
    name: 'Emily',
  },
];

async function seedAdmins() {
  console.log('🌱 Seeding admin users...\n');

  try {
    const client = await pool.connect();

    try {
      for (const admin of ADMIN_USERS) {
        // Check if user already exists
        const existing = await client.query(
          'SELECT id FROM admin_users WHERE email = $1',
          [admin.email]
        );

        if (existing.rows.length > 0) {
          console.log(`⚠️  Admin ${admin.email} already exists, skipping...`);
          continue;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(admin.password, 10);

        // Insert admin user
        const result = await client.query(
          `INSERT INTO admin_users (email, password_hash, name)
           VALUES ($1, $2, $3)
           RETURNING id, email, name`,
          [admin.email, passwordHash, admin.name]
        );

        console.log(
          `✅ Created admin user: ${result.rows[0].email} (${result.rows[0].name})`
        );
      }

      console.log('\n✨ Admin seeding complete!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    throw error;
  }
}

async function main() {
  console.log('🔄 Running database migrations...\n');
  
  const databaseUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (databaseUrl) {
    const isSupabase = databaseUrl.includes('supabase.co');
    if (isSupabase) {
      console.log('   Using Supabase connection string');
    } else {
      console.log('   Using PostgreSQL connection string');
    }
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
        '❌ Cannot connect to database. Please check your environment variables.'
      );
      process.exit(1);
    }

    await runMigrations();
    console.log('\n✅ Migration complete!');
    
    // Seed admin users after migrations
    await seedAdmins();
    
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

