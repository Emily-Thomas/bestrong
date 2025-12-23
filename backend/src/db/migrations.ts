import fs from 'node:fs';
import path from 'node:path';
import pool from '../config/database';

export async function runMigrations(): Promise<void> {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const migrationsDir = path.join(__dirname, '../../migrations');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log(`📄 Loaded schema file (${schema.length} characters)`);

    const client = await pool.connect();

    try {
      // Create schema_migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          description TEXT
        );
      `);
      console.log('✅ Schema migrations table ready');

      // Execute the base schema first (with error handling for existing objects)
      try {
        await client.query(schema);
        console.log('✅ Base schema executed successfully');
      } catch (error) {
        // If schema already exists, that's okay
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log('ℹ️  Base schema objects already exist, continuing...');
        } else {
          throw error;
        }
      }
      
      // Get all migration files and sort them
      if (fs.existsSync(migrationsDir)) {
        const migrationFiles = fs.readdirSync(migrationsDir)
          .filter(file => file.endsWith('.sql'))
          .sort(); // Sort alphabetically (which works for numbered files like 001_, 002_, etc.)
        
        console.log(`📄 Found ${migrationFiles.length} migration files`);
        
        for (const migrationFile of migrationFiles) {
          const migrationVersion = migrationFile.replace('.sql', '');
          
          // Check if migration has already been applied
          const checkResult = await client.query(
            'SELECT version FROM schema_migrations WHERE version = $1',
            [migrationVersion]
          );
          
          if (checkResult.rows.length > 0) {
            console.log(`⏭️  Migration ${migrationVersion} already applied, skipping...`);
            continue;
          }
          
          const migrationPath = path.join(migrationsDir, migrationFile);
          const migration = fs.readFileSync(migrationPath, 'utf8');
          
          console.log(`📄 Running migration: ${migrationVersion}...`);
          
          try {
            await client.query(migration);
            
            // Record migration as applied
            await client.query(
              'INSERT INTO schema_migrations (version, description) VALUES ($1, $2)',
              [migrationVersion, `Migration: ${migrationVersion}`]
            );
            
            console.log(`✅ Migration ${migrationVersion} completed successfully`);
          } catch (error) {
            // If migration fails due to objects already existing, that's okay (idempotent)
            if (error instanceof Error && error.message.includes('already exists')) {
              console.log(`ℹ️  Migration ${migrationVersion} - some objects already exist, marking as applied...`);
              // Still record it as applied since it's idempotent
              await client.query(
                'INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
                [migrationVersion, `Migration: ${migrationVersion}`]
              );
            } else {
              throw error;
            }
          }
        }
      } else {
        console.log('ℹ️  Migrations directory not found, skipping...');
      }
      
      // Verify critical tables exist
      const tablesToCheck = [
        'admin_users', 
        'clients', 
        'questionnaires', 
        'recommendations', 
        'workouts',
        'actual_workouts',
        'week_generation_jobs',
        'inbody_scans'
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
