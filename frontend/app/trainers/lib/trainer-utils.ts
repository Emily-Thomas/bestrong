import type { Trainer } from '@/lib/api';
import { personDisplayName, personInitials } from '@/lib/utils';

export type TrainerPersonaStatus = 'ready' | 'draft' | 'stale';

export function trainerDisplayName(t: Pick<Trainer, 'first_name' | 'last_name'>) {
  return personDisplayName(t.first_name, t.last_name);
}

export function trainerInitials(first: string, last: string): string {
  return personInitials(first, last);
}

export function trainerAvatarAlt(t: Pick<Trainer, 'first_name' | 'last_name'>) {
  return `${trainerDisplayName(t)} profile photo`;
}

export function trainerPersonaStatus(t: Trainer): TrainerPersonaStatus {
  if (t.persona_stale && t.structured_persona) return 'stale';
  if (t.structured_persona && !t.persona_stale) return 'ready';
  return 'draft';
}

export function trainerPersonaStatusLabel(
  status: TrainerPersonaStatus,
  compact = false
): string {
  if (compact) {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'stale':
        return 'Stale';
      case 'draft':
        return 'Draft';
    }
  }
  switch (status) {
    case 'ready':
      return 'Ready for programs';
    case 'stale':
      return 'Needs regenerate';
    case 'draft':
      return 'Draft (no persona)';
  }
}

export function trainerSearchHaystack(t: Trainer): string {
  return [
    t.first_name,
    t.last_name,
    t.email,
    t.title,
    t.structured_persona?.coaching_headline,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export const PERSONA_GENERATION_STEPS = [
  'Reading your coaching notes…',
  'Extracting programming pillars…',
  'Shaping client fit and guardrails…',
  'Writing Scout program context…',
] as const;
