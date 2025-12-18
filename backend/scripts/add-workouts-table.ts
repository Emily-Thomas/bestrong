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
  console.log('🔄 Adding workouts table to database...\n');

  const client = await pool.connect();

  try {
    // Check if table already exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'workouts'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('ℹ️  Workouts table already exists, skipping...');
      process.exit(0);
    }

    // Create workouts table
    await client.query(`
      CREATE TABLE workouts (
        id SERIAL PRIMARY KEY,
        recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
        
        -- Workout metadata
        week_number INTEGER NOT NULL,
        session_number INTEGER NOT NULL,
        workout_name VARCHAR(255),
        
        -- Workout structure (stored as JSON)
        workout_data JSONB NOT NULL,
        
        -- AI reasoning for this specific workout
        workout_reasoning TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Ensure unique workout per session
        UNIQUE(recommendation_id, week_number, session_number)
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workouts_recommendation_id ON workouts(recommendation_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workouts_week_session ON workouts(recommendation_id, week_number, session_number);
    `);

    // Create trigger for updated_at
    await client.query(`
      CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Workouts table created successfully!');
    console.log('✅ Indexes created successfully!');
    console.log('✅ Trigger created successfully!');
  } catch (error) {
    console.error('❌ Error creating workouts table:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

