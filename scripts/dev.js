#!/usr/bin/env node

const { spawn } = require('child_process');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPostgreSQL() {
  return new Promise((resolve) => {
    // Try to connect to PostgreSQL using psql or pg_isready
    exec('which pg_isready', (error) => {
      if (error) {
        log('⚠️  PostgreSQL tools not found in PATH', 'yellow');
        log('   Please ensure PostgreSQL is installed and running', 'yellow');
        log('   You can check manually with: pg_isready', 'yellow');
        resolve(false);
        return;
      }

      exec('pg_isready -h localhost -p 5432', (error) => {
        if (error) {
          log('⚠️  PostgreSQL is not accessible at localhost:5432', 'yellow');
          log('   Please ensure PostgreSQL is running:', 'yellow');
          log('   - macOS: brew services start postgresql', 'yellow');
          log('   - Linux: sudo systemctl start postgresql', 'yellow');
          log('   - Or check your DB_HOST and DB_PORT in backend/.env', 'yellow');
          resolve(false);
          return;
        }

        log('✅ PostgreSQL is running', 'green');
        resolve(true);
      });
    });
  });
}

function checkEnvFile() {
  const envPath = path.join(__dirname, '../backend/.env');
  if (!fs.existsSync(envPath)) {
    log('⚠️  backend/.env file not found', 'yellow');
    log('   Creating from .env.example...', 'yellow');
    const envExamplePath = path.join(__dirname, '../backend/.env.example');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      log('   ✅ Created backend/.env - please update with your database credentials', 'green');
    } else {
      log('   ❌ .env.example not found. Please create backend/.env manually', 'red');
    }
    return false;
  }
  return true;
}

async function main() {
  log('\n🚀 Starting bestrong development environment...\n', 'bright');

  // Check environment file
  const envExists = checkEnvFile();
  if (!envExists) {
    log('\n⚠️  Please configure backend/.env before continuing\n', 'yellow');
  }

  // Check PostgreSQL
  log('Checking PostgreSQL connection...', 'cyan');
  const pgReady = await checkPostgreSQL();
  if (!pgReady) {
    log('\n⚠️  Continuing anyway, but backend may fail to connect to database\n', 'yellow');
  }

  log('\n📦 Starting services...\n', 'bright');

  // Start frontend and backend concurrently
  const frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '../frontend'),
    stdio: 'inherit',
    shell: true,
  });

  const backendProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '../backend'),
    stdio: 'inherit',
    shell: true,
  });

  // Handle process termination
  const cleanup = () => {
    log('\n\n🛑 Shutting down services...', 'yellow');
    frontendProcess.kill();
    backendProcess.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Log service URLs
  setTimeout(() => {
    log('\n✨ Services are starting up!', 'green');
    log('   Frontend: http://localhost:3000', 'cyan');
    log('   Backend:  http://localhost:3001', 'cyan');
    log('   Health:   http://localhost:3001/health', 'cyan');
    log('\n   Press Ctrl+C to stop all services\n', 'bright');
  }, 2000);
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});

