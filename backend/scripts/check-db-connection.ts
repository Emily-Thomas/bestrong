import path from 'node:path';
import { config } from 'dotenv';
import { Pool } from 'pg';

// Load .env
const envPath = path.join(__dirname, '../.env');
config({ path: envPath });

async function checkConnection() {
  console.log('🔍 Testing database connection...\n');
  console.log('Configuration:');
  console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  Port: ${process.env.DB_PORT || '5432'}`);
  console.log(`  Database: ${process.env.DB_NAME || 'bestrong'}`);
  console.log(`  User: ${process.env.DB_USER || 'postgres'}`);
  console.log(`  Password: ${process.env.DB_PASSWORD ? '***' : 'NOT SET'}\n`);

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'bestrong',
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || ''),
  });

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
