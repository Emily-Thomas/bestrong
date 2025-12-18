import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from 'dotenv';

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

/**
 * Verify that the workouts table exists after migration
 * If it doesn't exist, try to create it explicitly
 */
async function verifyWorkoutsTable() {
  console.log('🔍 Verifying workouts table...\n');

  try {
    const client = await pool.connect();

    try {
      // Check if workouts table exists
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'workouts'
        );
      `);

      if (result.rows[0].exists) {
        console.log('✅ Workouts table exists');
        
        // Check if indexes exist
        const indexResult = await client.query(`
          SELECT indexname 
          FROM pg_indexes 
          WHERE tablename = 'workouts' 
          AND schemaname = 'public';
        `);
        
        console.log(`✅ Found ${indexResult.rows.length} indexes on workouts table`);
        
        // Check if trigger exists
        const triggerResult = await client.query(`
          SELECT trigger_name 
          FROM information_schema.triggers 
          WHERE event_object_table = 'workouts' 
          AND trigger_schema = 'public';
        `);
        
        console.log(`✅ Found ${triggerResult.rows.length} triggers on workouts table`);
      } else {
        console.warn('⚠️  Workouts table does not exist - attempting to create it...');
        
        // Try to create the workouts table explicitly
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS workouts (
              id SERIAL PRIMARY KEY,
              recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
              week_number INTEGER NOT NULL,
              session_number INTEGER NOT NULL,
              workout_name VARCHAR(255),
              workout_data JSONB NOT NULL,
              workout_reasoning TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
          
          // Create trigger
          await client.query(`
            DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
          `);
          
          await client.query(`
            CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          `);
          
          console.log('✅ Successfully created workouts table, indexes, and trigger');
        } catch (createError) {
          console.error('❌ Failed to create workouts table:', createError);
          if (createError instanceof Error) {
            console.error(`   Error: ${createError.message}`);
          }
          throw createError;
        }
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error verifying/creating workouts table:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    // Don't throw - log the error but don't fail the deployment
    // The table might exist but verification failed
  }
}

async function verifyRecommendationJobsTable() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'recommendation_jobs'
        );
      `);

      if (result.rows[0].exists) {
        console.log('✅ Recommendation jobs table exists');
        
        // Check if indexes exist
        const indexResult = await client.query(`
          SELECT indexname 
          FROM pg_indexes 
          WHERE tablename = 'recommendation_jobs' 
          AND schemaname = 'public';
        `);
        
        console.log(`✅ Found ${indexResult.rows.length} indexes on recommendation_jobs table`);
        
        // Check if trigger exists
        const triggerResult = await client.query(`
          SELECT trigger_name 
          FROM information_schema.triggers 
          WHERE event_object_table = 'recommendation_jobs' 
          AND trigger_schema = 'public';
        `);
        
        console.log(`✅ Found ${triggerResult.rows.length} triggers on recommendation_jobs table`);
      } else {
        console.warn('⚠️  Recommendation jobs table does not exist - attempting to create it...');
        
        // Try to create the recommendation_jobs table explicitly
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS recommendation_jobs (
              id SERIAL PRIMARY KEY,
              questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
              client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
              created_by INTEGER REFERENCES admin_users(id),
              status VARCHAR(50) DEFAULT 'pending',
              current_step VARCHAR(255),
              recommendation_id INTEGER REFERENCES recommendations(id),
              error_message TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              started_at TIMESTAMP,
              completed_at TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // Create indexes
          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_recommendation_jobs_status ON recommendation_jobs(status);
          `);
          
          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_recommendation_jobs_questionnaire_id ON recommendation_jobs(questionnaire_id);
          `);
          
          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_recommendation_jobs_client_id ON recommendation_jobs(client_id);
          `);
          
          // Create trigger
          await client.query(`
            DROP TRIGGER IF EXISTS update_recommendation_jobs_updated_at ON recommendation_jobs;
          `);
          
          await client.query(`
            CREATE TRIGGER update_recommendation_jobs_updated_at BEFORE UPDATE ON recommendation_jobs
              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          `);
          
          console.log('✅ Successfully created recommendation_jobs table, indexes, and trigger');
        } catch (createError) {
          console.error('❌ Failed to create recommendation_jobs table:', createError);
          if (createError instanceof Error) {
            console.error(`   Error: ${createError.message}`);
          }
          throw createError;
        }
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error verifying/creating recommendation_jobs table:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    // Don't throw - log the error but don't fail the deployment
    // The table might exist but verification failed
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
    
    // Verify that the workouts table was created
    await verifyWorkoutsTable();
    
    // Verify that the recommendation_jobs table was created
    await verifyRecommendationJobsTable();
    
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

