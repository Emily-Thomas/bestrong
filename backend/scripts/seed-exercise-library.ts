import dotenv from 'dotenv';
import pool from '../src/config/database';
import { seedExerciseLibraryExercises } from '../src/seeds/exercise-library.seed';

dotenv.config();

async function main() {
  try {
    await seedExerciseLibraryExercises();
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
