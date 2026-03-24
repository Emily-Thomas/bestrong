import { createHash } from 'node:crypto';
import pool from '../config/database';
import type {
  CreateTrainerInput,
  Trainer,
  TrainerCoachMatchOption,
  TrainerPersonaStructured,
  TrainerWithPersonaMeta,
  UpdateTrainerInput,
} from '../types';

export function hashTrainerPersonaInputs(
  raw_trainer_definition: string,
  raw_client_needs: string
): string {
  return createHash('sha256')
    .update(`${raw_trainer_definition}\n---\n${raw_client_needs}`, 'utf8')
    .digest('hex');
}

export function enrichTrainerWithPersonaMeta(
  t: Trainer
): TrainerWithPersonaMeta {
  const hash = hashTrainerPersonaInputs(
    t.raw_trainer_definition,
    t.raw_client_needs
  );
  const persona_stale =
    !t.structured_persona ||
    !t.persona_generated_at ||
    t.persona_raw_content_hash !== hash;
  return { ...t, persona_stale };
}

export function enrichTrainersWithPersonaMeta(
  trainers: Trainer[]
): TrainerWithPersonaMeta[] {
  return trainers.map(enrichTrainerWithPersonaMeta);
}

export async function createTrainer(
  input: CreateTrainerInput,
  createdBy: number
): Promise<Trainer> {
  const {
    first_name,
    last_name,
    email,
    title,
    image_url,
    raw_trainer_definition,
    raw_client_needs,
  } = input;

  const result = await pool.query<Trainer>(
    `INSERT INTO trainers (
      created_by, first_name, last_name, email, title, image_url,
      raw_trainer_definition, raw_client_needs
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      createdBy,
      first_name,
      last_name,
      email?.trim() || null,
      title,
      image_url?.trim() || null,
      raw_trainer_definition,
      raw_client_needs,
    ]
  );

  return result.rows[0];
}

export async function getTrainerById(
  id: number,
  adminId: number
): Promise<Trainer | null> {
  const result = await pool.query<Trainer>(
    `SELECT * FROM trainers WHERE id = $1 AND created_by = $2`,
    [id, adminId]
  );
  return result.rows[0] || null;
}

export async function getTrainersByAdmin(adminId: number): Promise<Trainer[]> {
  const result = await pool.query<Trainer>(
    `SELECT * FROM trainers WHERE created_by = $1 ORDER BY last_name ASC, first_name ASC`,
    [adminId]
  );
  return result.rows;
}

/**
 * Trainers with a generated persona can be matched to clients for “recommended coach”.
 * Summary is truncated to keep the planning prompt within token limits.
 */
export function trainersToCoachMatchOptions(
  trainers: Trainer[],
  maxSummaryChars = 900
): TrainerCoachMatchOption[] {
  return trainers
    .filter((t) => t.structured_persona?.ai_prompt_injection?.trim())
    .map((t) => {
      const inj = t.structured_persona?.ai_prompt_injection?.trim();
      if (!inj) {
        throw new Error(
          'Invariant: trainer passed filter must have prompt injection'
        );
      }
      const program_summary =
        inj.length > maxSummaryChars
          ? `${inj.slice(0, maxSummaryChars)}…`
          : inj;
      return {
        id: t.id,
        display_name: `${t.first_name} ${t.last_name}`.trim(),
        title: t.title || 'Coach',
        program_summary,
      };
    });
}

export async function updateTrainer(
  id: number,
  adminId: number,
  input: UpdateTrainerInput
): Promise<Trainer | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let n = 1;

  if (input.first_name !== undefined) {
    fields.push(`first_name = $${n++}`);
    values.push(input.first_name);
  }
  if (input.last_name !== undefined) {
    fields.push(`last_name = $${n++}`);
    values.push(input.last_name);
  }
  if (input.email !== undefined) {
    fields.push(`email = $${n++}`);
    values.push(input.email?.trim() || null);
  }
  if (input.title !== undefined) {
    fields.push(`title = $${n++}`);
    values.push(input.title);
  }
  if (input.image_url !== undefined) {
    fields.push(`image_url = $${n++}`);
    values.push(input.image_url?.trim() || null);
  }
  if (input.raw_trainer_definition !== undefined) {
    fields.push(`raw_trainer_definition = $${n++}`);
    values.push(input.raw_trainer_definition);
  }
  if (input.raw_client_needs !== undefined) {
    fields.push(`raw_client_needs = $${n++}`);
    values.push(input.raw_client_needs);
  }

  if (fields.length === 0) {
    return getTrainerById(id, adminId);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id, adminId);

  const result = await pool.query<Trainer>(
    `UPDATE trainers SET ${fields.join(', ')}
     WHERE id = $${n} AND created_by = $${n + 1}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteTrainer(
  id: number,
  adminId: number
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM trainers WHERE id = $1 AND created_by = $2`,
    [id, adminId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Returns the ai_prompt_injection block for program generation, or throws if missing.
 */
export async function getCoachPromptInjectionForPlan(
  trainerId: number,
  adminId: number
): Promise<string> {
  const trainer = await getTrainerById(trainerId, adminId);
  if (!trainer) {
    throw new Error('Trainer not found');
  }
  const injection = trainer.structured_persona?.ai_prompt_injection?.trim();
  if (!injection) {
    throw new Error(
      'This trainer needs a generated coaching persona before their profile can be used in AI plans.'
    );
  }
  return injection;
}

export async function saveTrainerStructuredPersona(
  id: number,
  adminId: number,
  structured: TrainerPersonaStructured,
  rawHash: string
): Promise<Trainer | null> {
  const result = await pool.query<Trainer>(
    `UPDATE trainers SET
      structured_persona = $1::jsonb,
      persona_generated_at = CURRENT_TIMESTAMP,
      persona_raw_content_hash = $2,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND created_by = $4
     RETURNING *`,
    [JSON.stringify(structured), rawHash, id, adminId]
  );
  return result.rows[0] || null;
}
