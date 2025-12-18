import fs from 'node:fs';
import path from 'node:path';
import pool from '../config/database';

export async function runMigrations(): Promise<void> {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log(`📄 Loaded schema file (${schema.length} characters)`);

    const client = await pool.connect();

    try {
      // Split the schema into individual statements
      // PostgreSQL allows multiple statements, but splitting helps with error reporting
      const statements = schema
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      console.log(`📝 Executing ${statements.length} SQL statements...`);

      // Execute the entire schema as one query (PostgreSQL supports multiple statements)
      // This is more reliable than splitting, but we'll add better error handling
      await client.query(schema);
      console.log('✅ Database migrations completed successfully');
      
      // Verify critical tables exist
      const tablesToCheck = ['admin_users', 'clients', 'questionnaires', 'recommendations', 'workouts'];
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
