import pool from '../config/database';
import type { Client, CreateClientInput, UpdateClientInput } from '../types';

function normalizeOnboardingTrack(
  track: CreateClientInput['onboarding_track']
): 'standard' | 'imported_program' {
  return track === 'imported_program' ? 'imported_program' : 'standard';
}

function isMissingColumnError(error: unknown, column: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const pgError = error as { code?: string; message?: string };
  return pgError.code === '42703' && (pgError.message?.includes(column) ?? false);
}

export async function createClient(
  input: CreateClientInput,
  createdBy: number
): Promise<Client> {
  const { first_name, last_name, email, phone, date_of_birth } = input;
  const onboarding_track = normalizeOnboardingTrack(input.onboarding_track);

  try {
    const result = await pool.query<Client>(
      `INSERT INTO clients (
        first_name, last_name, email, phone, date_of_birth, created_by, onboarding_track
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        first_name,
        last_name,
        email || null,
        phone || null,
        date_of_birth || null,
        createdBy,
        onboarding_track,
      ]
    );
    return result.rows[0];
  } catch (error) {
    if (!isMissingColumnError(error, 'onboarding_track')) {
      throw error;
    }

    const result = await pool.query<Client>(
      `INSERT INTO clients (first_name, last_name, email, phone, date_of_birth, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        first_name,
        last_name,
        email || null,
        phone || null,
        date_of_birth || null,
        createdBy,
      ]
    );

    return {
      ...result.rows[0],
      onboarding_track,
    };
  }
}

export async function getClientById(id: number): Promise<Client | null> {
  const result = await pool.query<Client>(
    'SELECT * FROM clients WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

/** All clients are visible to every authenticated admin (shared roster). */
export async function getAllClients(): Promise<Client[]> {
  const result = await pool.query<Client>(
    'SELECT * FROM clients ORDER BY created_at DESC'
  );
  return result.rows;
}

export async function updateClient(
  id: number,
  input: UpdateClientInput
): Promise<Client | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (input.first_name !== undefined) {
    fields.push(`first_name = $${paramCount++}`);
    values.push(input.first_name);
  }
  if (input.last_name !== undefined) {
    fields.push(`last_name = $${paramCount++}`);
    values.push(input.last_name);
  }
  if (input.email !== undefined) {
    fields.push(`email = $${paramCount++}`);
    values.push(input.email);
  }
  if (input.phone !== undefined) {
    fields.push(`phone = $${paramCount++}`);
    values.push(input.phone);
  }
  if (input.date_of_birth !== undefined) {
    fields.push(`date_of_birth = $${paramCount++}`);
    values.push(input.date_of_birth);
  }
  if (input.status !== undefined) {
    fields.push(`status = $${paramCount++}`);
    values.push(input.status);
  }
  if (input.onboarding_track !== undefined) {
    fields.push(`onboarding_track = $${paramCount++}`);
    values.push(
      input.onboarding_track === 'imported_program'
        ? 'imported_program'
        : 'standard'
    );
  }

  if (fields.length === 0) {
    return getClientById(id);
  }

  values.push(id);
  const query = `UPDATE clients SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

  try {
    const result = await pool.query<Client>(query, values);
    return result.rows[0] || null;
  } catch (error) {
    if (
      input.onboarding_track !== undefined &&
      isMissingColumnError(error, 'onboarding_track')
    ) {
      const existing = await getClientById(id);
      if (!existing) return null;
      return {
        ...existing,
        onboarding_track: normalizeOnboardingTrack(input.onboarding_track),
      };
    }
    throw error;
  }
}

export async function activateClient(id: number): Promise<Client | null> {
  const result = await pool.query<Client>(
    `UPDATE clients 
     SET status = 'active'
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

export async function deleteClient(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM clients WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
