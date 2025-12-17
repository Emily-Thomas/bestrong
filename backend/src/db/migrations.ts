import fs from 'node:fs';
import path from 'node:path';
import pool from '../config/database';

export async function runMigrations(): Promise<void> {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    const client = await pool.connect();

    try {
      // Execute the entire schema as one query (PostgreSQL supports multiple statements)
      await client.query(schema);
      console.log('✅ Database migrations completed successfully');
    } catch (error) {
      // If tables already exist, that's okay
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('ℹ️  Database tables already exist, skipping migration');
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
