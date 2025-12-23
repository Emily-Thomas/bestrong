import pool from '../config/database';
import type {
  InBodyScan,
  CreateInBodyScanInput,
  UpdateInBodyScanInput,
} from '../types';

export async function createInBodyScan(
  input: CreateInBodyScanInput,
  uploadedBy: number
): Promise<InBodyScan> {
  const {
    client_id,
    file_path,
    file_name,
    file_size_bytes,
    mime_type = 'image/png',
  } = input;

  const result = await pool.query<InBodyScan>(
    `INSERT INTO inbody_scans (client_id, uploaded_by, file_path, file_name, file_size_bytes, mime_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [client_id, uploadedBy, file_path, file_name, file_size_bytes || null, mime_type]
  );

  return result.rows[0];
}

export async function getInBodyScanById(id: number): Promise<InBodyScan | null> {
  const result = await pool.query<InBodyScan>(
    'SELECT * FROM inbody_scans WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

export async function getInBodyScansByClientId(
  clientId: number
): Promise<InBodyScan[]> {
  const result = await pool.query<InBodyScan>(
    `SELECT * FROM inbody_scans 
     WHERE client_id = $1 
     ORDER BY scan_date DESC NULLS LAST, created_at DESC`,
    [clientId]
  );

  return result.rows;
}

export async function getLatestInBodyScanByClientId(
  clientId: number
): Promise<InBodyScan | null> {
  const result = await pool.query<InBodyScan>(
    `SELECT * FROM inbody_scans 
     WHERE client_id = $1 
     ORDER BY scan_date DESC NULLS LAST, created_at DESC 
     LIMIT 1`,
    [clientId]
  );

  return result.rows[0] || null;
}

export async function getLatestVerifiedInBodyScanByClientId(
  clientId: number
): Promise<InBodyScan | null> {
  const result = await pool.query<InBodyScan>(
    `SELECT * FROM inbody_scans 
     WHERE client_id = $1 AND verified = true
     ORDER BY scan_date DESC NULLS LAST, created_at DESC 
     LIMIT 1`,
    [clientId]
  );

  return result.rows[0] || null;
}

export async function hasInBodyScan(clientId: number): Promise<boolean> {
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM inbody_scans WHERE client_id = $1',
    [clientId]
  );

  return parseInt(result.rows[0].count, 10) > 0;
}

export async function updateInBodyScan(
  id: number,
  input: UpdateInBodyScanInput
): Promise<InBodyScan | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (input.scan_date !== undefined) {
    fields.push(`scan_date = $${paramCount++}`);
    values.push(input.scan_date);
  }
  if (input.weight_lbs !== undefined) {
    fields.push(`weight_lbs = $${paramCount++}`);
    values.push(input.weight_lbs);
  }
  if (input.smm_lbs !== undefined) {
    fields.push(`smm_lbs = $${paramCount++}`);
    values.push(input.smm_lbs);
  }
  if (input.body_fat_mass_lbs !== undefined) {
    fields.push(`body_fat_mass_lbs = $${paramCount++}`);
    values.push(input.body_fat_mass_lbs);
  }
  if (input.bmi !== undefined) {
    fields.push(`bmi = $${paramCount++}`);
    values.push(input.bmi);
  }
  if (input.percent_body_fat !== undefined) {
    fields.push(`percent_body_fat = $${paramCount++}`);
    values.push(input.percent_body_fat);
  }
  if (input.segment_analysis !== undefined) {
    fields.push(`segment_analysis = $${paramCount++}`);
    values.push(JSON.stringify(input.segment_analysis));
  }
  if (input.extraction_status !== undefined) {
    fields.push(`extraction_status = $${paramCount++}`);
    values.push(input.extraction_status);
  }
  if (input.verified !== undefined) {
    fields.push(`verified = $${paramCount++}`);
    values.push(input.verified);
    if (input.verified) {
      // Set verified_at and verified_by when marking as verified
      fields.push(`verified_at = CURRENT_TIMESTAMP`);
    }
  }

  if (fields.length === 0) {
    return getInBodyScanById(id);
  }

  values.push(id);
  const query = `UPDATE inbody_scans SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

  const result = await pool.query<InBodyScan>(query, values);
  return result.rows[0] || null;
}

export async function updateExtractionResult(
  id: number,
  extractionData: {
    extraction_status: 'completed' | 'failed';
    extraction_raw_response?: string;
    scan_date?: string;
    weight_lbs?: number;
    smm_lbs?: number;
    body_fat_mass_lbs?: number;
    bmi?: number;
    percent_body_fat?: number;
    segment_analysis?: unknown;
  }
): Promise<InBodyScan | null> {
  const {
    extraction_status,
    extraction_raw_response,
    scan_date,
    weight_lbs,
    smm_lbs,
    body_fat_mass_lbs,
    bmi,
    percent_body_fat,
    segment_analysis,
  } = extractionData;

  const result = await pool.query<InBodyScan>(
    `UPDATE inbody_scans 
     SET extraction_status = $1,
         extraction_raw_response = $2,
         scan_date = $3,
         weight_lbs = $4,
         smm_lbs = $5,
         body_fat_mass_lbs = $6,
         bmi = $7,
         percent_body_fat = $8,
         segment_analysis = $9
     WHERE id = $10
     RETURNING *`,
    [
      extraction_status,
      extraction_raw_response || null,
      scan_date || null,
      weight_lbs || null,
      smm_lbs || null,
      body_fat_mass_lbs || null,
      bmi || null,
      percent_body_fat || null,
      segment_analysis ? JSON.stringify(segment_analysis) : null,
      id,
    ]
  );

  return result.rows[0] || null;
}

export async function deleteInBodyScan(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM inbody_scans WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

