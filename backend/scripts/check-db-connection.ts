import path from 'node:path';
import { config } from 'dotenv';
import { Pool } from 'pg';

// Load .env
const envPath = path.join(__dirname, '../.env');
config({ path: envPath });

async function checkConnection() {
  console.log('🔍 Testing database connection...\n');
  
  // Check for connection string first (Supabase standard)
  const databaseUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
  
  if (databaseUrl) {
    console.log('Configuration:');
    console.log(`  Using connection string: ${databaseUrl.includes('supabase.co') ? 'Supabase' : 'PostgreSQL'}\n`);
  } else {
    console.log('Configuration:');
    console.log(`  Host: ${process.env.POSTGRES_HOST || 'localhost'}`);
    console.log(`  Port: ${process.env.POSTGRES_PORT || '5432'}`);
    console.log(`  Database: ${process.env.POSTGRES_DATABASE || 'postgres'}`);
    console.log(`  User: ${process.env.POSTGRES_USER || 'postgres'}`);
    console.log(`  Password: ${process.env.POSTGRES_PASSWORD ? '***' : 'NOT SET'}\n`);
  }

  const poolConfig = databaseUrl
    ? {
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('supabase.co')
          ? { rejectUnauthorized: false }
          : undefined,
      }
    : {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        database: process.env.POSTGRES_DATABASE || 'postgres',
        user: process.env.POSTGRES_USER || 'postgres',
        password: String(process.env.POSTGRES_PASSWORD || ''),
        ssl: process.env.POSTGRES_HOST?.includes('supabase.co')
          ? { rejectUnauthorized: false }
          : undefined,
      };

  const pool = new Pool(poolConfig);

  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Connection successful!');
    console.log(`   Server time: ${result.rows[0].now}\n`);
    await pool.end();
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Connection failed:', error.message);
      if (error.message.includes('password authentication failed')) {
        console.error(
          '\n💡 The password in your .env file does not match the PostgreSQL password.'
        );
        console.error('   Options:');
        console.error('   1. Update .env with the correct PostgreSQL password');
        console.error('   2. Reset PostgreSQL password to match .env:');
        console.error(
          '      psql -U postgres -c "ALTER USER postgres PASSWORD \'bestrong\';"'
        );
        console.error('   3. Or use a different PostgreSQL user');
      }
    }
    await pool.end();
    process.exit(1);
  }
}

checkConnection();
