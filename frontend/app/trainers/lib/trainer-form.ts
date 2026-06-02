import type { CreateTrainerInput, Trainer } from '@/lib/api';

export const EMPTY_TRAINER_FORM: CreateTrainerInput = {
  first_name: '',
  last_name: '',
  email: '',
  title: '',
  image_url: '',
  raw_trainer_definition: '',
  raw_client_needs: '',
};

export function trainerToForm(t: Trainer): CreateTrainerInput {
  return {
    first_name: t.first_name,
    last_name: t.last_name,
    email: t.email ?? '',
    title: t.title,
    image_url: t.image_url ?? '',
    raw_trainer_definition: t.raw_trainer_definition,
    raw_client_needs: t.raw_client_needs,
  };
}

export function validateTrainerForm(
  form: CreateTrainerInput
): string | null {
  if (!form.first_name.trim() || !form.last_name.trim()) {
    return 'First and last name are required.';
  }
  if (!form.title.trim()) {
    return 'Title is required.';
  }
  if (!form.raw_trainer_definition.trim()) {
    return 'Trainer definition is required.';
  }
  if (!form.raw_client_needs.trim()) {
    return 'Client needs description is required.';
  }
  return null;
}

export function trimTrainerPayload(
  form: CreateTrainerInput
): CreateTrainerInput {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email?.trim() || undefined,
    title: form.title.trim(),
    image_url: form.image_url?.trim() || undefined,
    raw_trainer_definition: form.raw_trainer_definition.trim(),
    raw_client_needs: form.raw_client_needs.trim(),
  };
}
