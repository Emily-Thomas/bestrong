import pool from '../config/database';
import type { Client, CreateClientInput } from '../types';

export async function createClient(
  input: CreateClientInput,
  createdBy: number
): Promise<Client> {
  const { first_name, last_name, email, phone, date_of_birth } = input;

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

  return result.rows[0];
}

export async function getClientById(id: number): Promise<Client | null> {
  const result = await pool.query<Client>(
    'SELECT * FROM clients WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

export async function getAllClients(adminId?: number): Promise<Client[]> {
  let query = 'SELECT * FROM clients';
  const params: number[] = [];

  if (adminId) {
    query += ' WHERE created_by = $1';
    params.push(adminId);
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query<Client>(query, params);
  return result.rows;
}

export async function updateClient(
  id: number,
  input: Partial<CreateClientInput>
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

  if (fields.length === 0) {
    return getClientById(id);
  }

  values.push(id);
  const query = `UPDATE clients SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

  const result = await pool.query<Client>(query, values);
  return result.rows[0] || null;
}

export async function deleteClient(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM clients WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
