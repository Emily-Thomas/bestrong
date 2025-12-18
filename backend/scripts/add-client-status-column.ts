import path from 'node:path';
import { config } from 'dotenv';
import pool from '../src/config/database';

// Load .env file explicitly BEFORE importing anything that uses it
const envPath = path.join(__dirname, '../.env');
const result = config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error.message);
  console.error(`   Expected location: ${envPath}`);
  process.exit(1);
}

async function main() {
  console.log('🔄 Adding status column to clients table...\n');

  const client = await pool.connect();

  try {
    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clients'
        AND column_name = 'status'
      );
    `);

    if (checkColumn.rows[0].exists) {
      console.log('ℹ️  Status column already exists, skipping...');
      process.exit(0);
    }

    // Add status column
    await client.query(`
      ALTER TABLE clients 
      ADD COLUMN status VARCHAR(50) DEFAULT 'prospect';
    `);

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
    `);

    // Update existing clients to have 'prospect' status
    await client.query(`
      UPDATE clients SET status = 'prospect' WHERE status IS NULL;
    `);

    console.log('✅ Status column added successfully!');
    console.log('   - Column: status (VARCHAR(50), DEFAULT \'prospect\')');
    console.log('   - Index: idx_clients_status');
    console.log('   - Existing clients set to \'prospect\'\n');
  } catch (error) {
    console.error('❌ Error adding status column:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

