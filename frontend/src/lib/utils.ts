import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Two-letter initials for avatars; safe when names are missing. */
export function personInitials(
  first?: string | null,
  last?: string | null
): string {
  const a = first?.trim()?.[0] ?? '';
  const b = last?.trim()?.[0] ?? '';
  const combined = `${a}${b}`.toUpperCase();
  return combined || '?';
}

export function personDisplayName(
  first?: string | null,
  last?: string | null
): string {
  return `${first ?? ''} ${last ?? ''}`.trim();
}
