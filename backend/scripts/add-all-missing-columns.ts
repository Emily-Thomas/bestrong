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
  console.log('🔄 Adding all missing columns to database...\n');

  const client = await pool.connect();

  try {
    // 1. Add status column to clients (if not exists)
    console.log('1. Checking clients.status...');
    const checkClientStatus = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clients'
        AND column_name = 'status'
      );
    `);
    if (!checkClientStatus.rows[0].exists) {
      await client.query(`ALTER TABLE clients ADD COLUMN status VARCHAR(50) DEFAULT 'prospect';`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);`);
      await client.query(`UPDATE clients SET status = 'prospect' WHERE status IS NULL;`);
      console.log('   ✅ Added clients.status');
    } else {
      console.log('   ℹ️  clients.status already exists');
    }

    // 2. Add columns to recommendations
    console.log('\n2. Checking recommendations columns...');
    const checkRecColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'recommendations'
      AND column_name IN ('current_week', 'started_at', 'completed_at');
    `);
    const existingRecColumns = checkRecColumns.rows.map(r => r.column_name);

    if (!existingRecColumns.includes('current_week')) {
      await client.query(`ALTER TABLE recommendations ADD COLUMN current_week INTEGER DEFAULT 1;`);
      await client.query(`UPDATE recommendations SET current_week = 1 WHERE current_week IS NULL;`);
      console.log('   ✅ Added recommendations.current_week');
    } else {
      console.log('   ℹ️  recommendations.current_week already exists');
    }

    if (!existingRecColumns.includes('started_at')) {
      await client.query(`ALTER TABLE recommendations ADD COLUMN started_at TIMESTAMP;`);
      console.log('   ✅ Added recommendations.started_at');
    } else {
      console.log('   ℹ️  recommendations.started_at already exists');
    }

    if (!existingRecColumns.includes('completed_at')) {
      await client.query(`ALTER TABLE recommendations ADD COLUMN completed_at TIMESTAMP;`);
      console.log('   ✅ Added recommendations.completed_at');
    } else {
      console.log('   ℹ️  recommendations.completed_at already exists');
    }

    if (!existingRecColumns.includes('current_week')) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_recommendations_current_week ON recommendations(current_week);`);
    }

    // 3. Add columns to workouts
    console.log('\n3. Checking workouts columns...');
    const checkWorkoutColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workouts'
      AND column_name IN ('status', 'scheduled_date', 'completed_at');
    `);
    const existingWorkoutColumns = checkWorkoutColumns.rows.map(r => r.column_name);

    if (!existingWorkoutColumns.includes('status')) {
      await client.query(`ALTER TABLE workouts ADD COLUMN status VARCHAR(50) DEFAULT 'scheduled';`);
      await client.query(`UPDATE workouts SET status = 'scheduled' WHERE status IS NULL;`);
      console.log('   ✅ Added workouts.status');
    } else {
      console.log('   ℹ️  workouts.status already exists');
    }

    if (!existingWorkoutColumns.includes('scheduled_date')) {
      await client.query(`ALTER TABLE workouts ADD COLUMN scheduled_date DATE;`);
      console.log('   ✅ Added workouts.scheduled_date');
    } else {
      console.log('   ℹ️  workouts.scheduled_date already exists');
    }

    if (!existingWorkoutColumns.includes('completed_at')) {
      await client.query(`ALTER TABLE workouts ADD COLUMN completed_at TIMESTAMP;`);
      console.log('   ✅ Added workouts.completed_at');
    } else {
      console.log('   ℹ️  workouts.completed_at already exists');
    }

    // Create indexes for workouts
    if (!existingWorkoutColumns.includes('status')) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_workouts_scheduled_date ON workouts(scheduled_date);`);
    }

    // 4. Check if actual_workouts table exists
    console.log('\n4. Checking actual_workouts table...');
    const checkActualWorkoutsTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'actual_workouts'
      );
    `);
    if (!checkActualWorkoutsTable.rows[0].exists) {
      await client.query(`
        CREATE TABLE actual_workouts (
          id SERIAL PRIMARY KEY,
          workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
          completed_by INTEGER REFERENCES admin_users(id),
          actual_performance JSONB NOT NULL,
          session_notes TEXT,
          overall_rir INTEGER,
          client_energy_level INTEGER,
          trainer_observations TEXT,
          started_at TIMESTAMP,
          completed_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(workout_id)
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_actual_workouts_workout_id ON actual_workouts(workout_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_actual_workouts_completed_by ON actual_workouts(completed_by);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_actual_workouts_completed_at ON actual_workouts(completed_at);`);
      
      // Add trigger
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
            DROP TRIGGER IF EXISTS update_actual_workouts_updated_at ON actual_workouts;
            CREATE TRIGGER update_actual_workouts_updated_at BEFORE UPDATE ON actual_workouts
              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
        END $$;
      `);
      console.log('   ✅ Created actual_workouts table');
    } else {
      console.log('   ℹ️  actual_workouts table already exists');
    }

    // 5. Check if week_generation_jobs table exists
    console.log('\n5. Checking week_generation_jobs table...');
    const checkWeekJobsTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'week_generation_jobs'
      );
    `);
    if (!checkWeekJobsTable.rows[0].exists) {
      await client.query(`
        CREATE TABLE week_generation_jobs (
          id SERIAL PRIMARY KEY,
          recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
          week_number INTEGER NOT NULL,
          created_by INTEGER REFERENCES admin_users(id),
          status VARCHAR(50) DEFAULT 'pending',
          current_step VARCHAR(255),
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(recommendation_id, week_number)
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_week_generation_jobs_status ON week_generation_jobs(status);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_week_generation_jobs_recommendation_id ON week_generation_jobs(recommendation_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_week_generation_jobs_week_number ON week_generation_jobs(week_number);`);
      
      // Add trigger
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
            DROP TRIGGER IF EXISTS update_week_generation_jobs_updated_at ON week_generation_jobs;
            CREATE TRIGGER update_week_generation_jobs_updated_at BEFORE UPDATE ON week_generation_jobs
              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
        END $$;
      `);
      console.log('   ✅ Created week_generation_jobs table');
    } else {
      console.log('   ℹ️  week_generation_jobs table already exists');
    }

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

