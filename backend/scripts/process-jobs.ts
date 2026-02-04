#!/usr/bin/env tsx
/**
 * Local job processor script
 * 
 * This script processes pending recommendation and week generation jobs.
 * Use this for local development when cron jobs are not available.
 * 
 * Usage:
 *   npm run process-jobs
 *   npm run process-jobs -- --watch  (runs continuously, checking every 10 seconds)
 *   npm run process-jobs -- --once    (processes once and exits, default)
 */

import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from 'dotenv';

// Load .env file explicitly BEFORE importing anything that uses it
// This MUST happen before any imports to ensure OpenAI client gets the API key
const scriptDir = __dirname;
const cwd = process.cwd();

// Possible .env file locations (in order of preference)
const possiblePaths = [
  path.join(scriptDir, '../.env'),           // From scripts/ directory -> backend/.env
  path.join(cwd, 'backend/.env'),            // From root directory -> backend/.env
  path.join(cwd, '.env'),                    // From backend directory -> backend/.env
];

let envPath = '';
let loaded = false;

// Load .env with override to ensure our values take precedence
for (const possiblePath of possiblePaths) {
  const absolutePath = path.resolve(possiblePath);
  if (existsSync(absolutePath)) {
    // Use override: true to ensure our .env values take precedence over any existing env vars
    const result = config({ path: absolutePath, override: true });
    if (!result.error) {
      envPath = absolutePath;
      loaded = true;
      // Verify OPENAI_API_KEY was actually loaded
      if (process.env.OPENAI_API_KEY) {
        break;
      }
    }
  }
}

if (loaded) {
  console.log(`✅ Loaded .env from: ${envPath}`);
} else {
  console.log('ℹ️  No .env file found, using environment variables from system');
  console.log(`   Tried locations:`);
  possiblePaths.forEach(p => {
    const abs = path.resolve(p);
    console.log(`     - ${abs} ${existsSync(abs) ? '(exists)' : '(not found)'}`);
  });
  console.log(`   Script directory: ${scriptDir}`);
  console.log(`   Current working directory: ${cwd}`);
}

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('\n❌ Missing required environment variable: OPENAI_API_KEY');
  if (loaded) {
    console.error(`   .env file was loaded from: ${envPath}`);
    console.error('   But OPENAI_API_KEY is not set in that file.');
    console.error('   Please check that OPENAI_API_KEY is defined in your .env file.');
  } else {
    console.error(`   Tried loading .env from:`);
    possiblePaths.forEach(p => console.error(`     - ${path.resolve(p)}`));
    console.error(`   Current working directory: ${cwd}`);
    console.error(`   Script directory: ${scriptDir}`);
    console.error('   Please ensure OPENAI_API_KEY is set in your .env file or environment');
  }
  process.exit(1);
}

// Verify the key is actually set (not just truthy check)
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
  console.error('\n❌ OPENAI_API_KEY is empty or whitespace');
  console.error('   Please set a valid OPENAI_API_KEY in your .env file');
  process.exit(1);
}

// CRITICAL: Double-check OPENAI_API_KEY is available before imports
// The OpenAI client in ai.service.ts is created at module load time,
// so we must ensure the env var is set before importing any modules
const apiKeyValue = process.env.OPENAI_API_KEY;
if (!apiKeyValue || apiKeyValue.trim() === '') {
  console.error('❌ OPENAI_API_KEY is not available before module imports');
  console.error('   This indicates the .env file was not loaded correctly');
  console.error(`   Current env vars: ${Object.keys(process.env).filter(k => k.includes('OPENAI')).join(', ') || 'none'}`);
  process.exit(1);
}

// Force set it again to be absolutely sure (in case something clears it)
process.env.OPENAI_API_KEY = apiKeyValue;

console.log(`✅ OPENAI_API_KEY verified and locked (${apiKeyValue.substring(0, 10)}...)`);

// Use dynamic imports to ensure .env is loaded BEFORE modules are evaluated
// Static imports are hoisted and run before this code, so we must use dynamic imports
const args = process.argv.slice(2);
const watchMode = args.includes('--watch');
const onceMode = args.includes('--once') || (!watchMode && !args.includes('--watch'));

async function processJobs(): Promise<void> {
  // Dynamic imports happen at runtime, after .env is loaded
  const { processRecommendationJob, processWeekGenerationJob } = await import('../src/routes/recommendation.routes');
  const jobService = await import('../src/services/job.service');
  const weekGenerationJobService = await import('../src/services/week-generation-job.service');

  try {
    // Process recommendation jobs
    const pendingJobs = await jobService.getPendingJobs();
    console.log(`\n📋 Found ${pendingJobs.length} pending recommendation job(s)`);
    
    let processedRecommendations = 0;
    for (const job of pendingJobs) {
      try {
        console.log(`\n🔄 Processing recommendation job ${job.id}...`);
        await processRecommendationJob(job.id);
        processedRecommendations++;
        console.log(`✅ Successfully processed recommendation job ${job.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error processing recommendation job ${job.id}:`, errorMessage);
        // Continue with next job
      }
    }

    // Process week generation jobs
    const pendingWeekJobs = await weekGenerationJobService.getPendingWeekGenerationJobs();
    console.log(`\n📋 Found ${pendingWeekJobs.length} pending week generation job(s)`);
    
    if (pendingWeekJobs.length > 0) {
      console.log(`   Job IDs: ${pendingWeekJobs.map(j => j.id).join(', ')}`);
    }
    
    let processedWeeks = 0;
    for (const job of pendingWeekJobs) {
      try {
        console.log(`\n🔄 Processing week generation job ${job.id} (recommendation ${job.recommendation_id}, week ${job.week_number})...`);
        await processWeekGenerationJob(job.id);
        processedWeeks++;
        console.log(`✅ Successfully processed week generation job ${job.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error(`❌ Error processing week generation job ${job.id}:`, errorMessage);
        if (errorStack) {
          console.error(`   Stack trace:`, errorStack);
        }
        // Continue with next job
      }
    }

    const totalProcessed = processedRecommendations + processedWeeks;
    if (totalProcessed > 0) {
      console.log(`\n✨ Processed ${processedRecommendations} recommendation job(s) and ${processedWeeks} week generation job(s)`);
    } else {
      console.log(`\n✨ No pending jobs to process`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Fatal error processing jobs:', errorMessage);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting job processor...');
  console.log(`   Mode: ${watchMode ? 'watch (continuous)' : 'once (single run)'}`);
  
  if (watchMode) {
    console.log('   Checking for jobs every 10 seconds...');
    console.log('   Press Ctrl+C to stop\n');
    
    // Process immediately (this will load modules via dynamic import)
    await processJobs();
    
    // Then set up interval
    // Note: processJobs uses dynamic imports, so modules are loaded fresh each time
    const interval = setInterval(async () => {
      await processJobs();
    }, 10000); // Check every 10 seconds
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n👋 Shutting down job processor...');
      clearInterval(interval);
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n\n👋 Shutting down job processor...');
      clearInterval(interval);
      process.exit(0);
    });
  } else {
    await processJobs();
    console.log('\n✅ Job processing complete');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
