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
  console.log('🔄 Adding recommendation_jobs table to database...\n');

  const client = await pool.connect();

  try {
    // Check if table already exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'recommendation_jobs'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('ℹ️  Recommendation jobs table already exists, skipping...');
      process.exit(0);
    }

    // Create recommendation_jobs table
    await client.query(`
      CREATE TABLE recommendation_jobs (
        id SERIAL PRIMARY KEY,
        questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        created_by INTEGER REFERENCES admin_users(id),
        
        -- Job status
        status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
        current_step VARCHAR(255), -- e.g., "Generating plan structure", "Generating workouts"
        
        -- Results
        recommendation_id INTEGER REFERENCES recommendations(id),
        error_message TEXT,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX idx_recommendation_jobs_status ON recommendation_jobs(status);
      CREATE INDEX idx_recommendation_jobs_questionnaire_id ON recommendation_jobs(questionnaire_id);
      CREATE INDEX idx_recommendation_jobs_client_id ON recommendation_jobs(client_id);
    `);

    // Add trigger for updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_recommendation_jobs_updated_at ON recommendation_jobs;
      CREATE TRIGGER update_recommendation_jobs_updated_at BEFORE UPDATE ON recommendation_jobs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Recommendation jobs table created successfully!');
    console.log('   - Table: recommendation_jobs');
    console.log('   - Indexes: status, questionnaire_id, client_id');
    console.log('   - Trigger: auto-update updated_at\n');
  } catch (error) {
    console.error('❌ Error creating recommendation_jobs table:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

