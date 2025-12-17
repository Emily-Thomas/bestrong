import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { generateToken } from '../middleware/auth';
import type {
  AdminUser,
  AdminUserWithPassword,
  CreateAdminUserInput,
  LoginInput,
} from '../types';

export async function createAdminUser(
  input: CreateAdminUserInput
): Promise<AdminUser> {
  const { email, password, name } = input;

  // Check if user already exists
  const existingUser = await pool.query(
    'SELECT id FROM admin_users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert user
  const result = await pool.query(
    `INSERT INTO admin_users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, created_at, updated_at`,
    [email, passwordHash, name]
  );

  return result.rows[0];
}

export async function loginAdminUser(
  input: LoginInput
): Promise<{ user: AdminUser; token: string }> {
  const { email, password } = input;

  // Find user
  const result = await pool.query<AdminUserWithPassword>(
    'SELECT * FROM admin_users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    type: 'admin',
  });

  // Return user without password
  const { password_hash: _passwordHash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

export async function getAdminUserById(id: number): Promise<AdminUser | null> {
  const result = await pool.query<AdminUser>(
    'SELECT id, email, name, created_at, updated_at FROM admin_users WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}
