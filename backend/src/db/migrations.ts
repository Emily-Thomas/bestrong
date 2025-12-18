import fs from 'node:fs';
import path from 'node:path';
import pool from '../config/database';

export async function runMigrations(): Promise<void> {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const migrationPath = path.join(__dirname, '../../migrations/009_workout_execution_feature.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log(`📄 Loaded schema file (${schema.length} characters)`);

    const client = await pool.connect();

    try {
      // Execute the base schema first
      await client.query(schema);
      console.log('✅ Base schema executed successfully');
      
      // Execute the workout execution feature migration if it exists
      if (fs.existsSync(migrationPath)) {
        console.log('📄 Loading workout execution feature migration...');
        const migration = fs.readFileSync(migrationPath, 'utf8');
        await client.query(migration);
        console.log('✅ Workout execution feature migration completed successfully');
      } else {
        console.log('ℹ️  Workout execution feature migration not found, skipping...');
      }
      
      // Verify critical tables exist
      const tablesToCheck = [
        'admin_users', 
        'clients', 
        'questionnaires', 
        'recommendations', 
        'workouts',
        'actual_workouts',
        'week_generation_jobs'
      ];
      for (const tableName of tablesToCheck) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [tableName]);
        
        if (result.rows[0].exists) {
          console.log(`✅ Table '${tableName}' exists`);
        } else {
          console.warn(`⚠️  Table '${tableName}' does NOT exist`);
        }
      }
    } catch (error) {
      // Log the full error for debugging
      if (error instanceof Error) {
        console.error('❌ Migration error details:');
        console.error(`   Message: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
      }
      
      // If tables already exist, that's okay (but we still want to create missing ones)
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('ℹ️  Some database objects already exist, continuing...');
        // Don't throw - continue to verify tables exist
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
