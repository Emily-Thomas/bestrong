import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool from '../src/config/database';

dotenv.config();

const ADMIN_USERS = [
  {
    email: 'matt@bestrong.com',
    password: 'bestrong',
    name: 'Matt',
  },
  {
    email: 'emily@bestrong.com',
    password: 'bestrong',
    name: 'Emily',
  },
  {
    email: 'liz@bestrong.com',
    password: 'bestrong',
    name: 'Liz Wood',
  },
];

async function seedAdmins() {
  console.log('🌱 Seeding admin users...\n');

  try {
    const client = await pool.connect();

    try {
      for (const admin of ADMIN_USERS) {
        // Check if user already exists
        const existing = await client.query(
          'SELECT id FROM admin_users WHERE email = $1',
          [admin.email]
        );

        if (existing.rows.length > 0) {
          console.log(`⚠️  Admin ${admin.email} already exists, skipping...`);
          continue;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(admin.password, 10);

        // Insert admin user
        const result = await client.query(
          `INSERT INTO admin_users (email, password_hash, name)
           VALUES ($1, $2, $3)
           RETURNING id, email, name`,
          [admin.email, passwordHash, admin.name]
        );

        console.log(
          `✅ Created admin user: ${result.rows[0].email} (${result.rows[0].name})`
        );
      }

      console.log('\n✨ Admin seeding complete!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seedAdmins();
