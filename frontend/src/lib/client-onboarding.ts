import type { Client } from '@/lib/api';

export type ClientOnboardingTrack = 'standard' | 'imported_program';

const SESSION_PREFIX = 'scout-client-imported:';

export function isImportedProgramClient(
  client: Pick<Client, 'onboarding_track'> | null | undefined
): boolean {
  return client?.onboarding_track === 'imported_program';
}

export function markImportedProgramClient(clientId: number): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`${SESSION_PREFIX}${clientId}`, '1');
}

export function hasImportedProgramSession(clientId: number): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(`${SESSION_PREFIX}${clientId}`) === '1';
}

export function clearImportedProgramSession(clientId: number): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`${SESSION_PREFIX}${clientId}`);
}

export function importedProgramFromSearchParams(
  searchParams: Pick<URLSearchParams, 'get'>
): boolean {
  return (
    searchParams.get('imported') === '1' ||
    searchParams.get('track') === 'imported_program'
  );
}

/** DB track, URL flag, or session marker from Add Client flow */
export function resolveImportedProgramClient(
  client: Pick<Client, 'onboarding_track'> | null | undefined,
  options: {
    clientId?: number;
    searchParams?: Pick<URLSearchParams, 'get'>;
  } = {}
): boolean {
  if (isImportedProgramClient(client)) return true;
  if (
    options.searchParams &&
    importedProgramFromSearchParams(options.searchParams)
  ) {
    return true;
  }
  if (
    options.clientId != null &&
    hasImportedProgramSession(options.clientId)
  ) {
    return true;
  }
  return false;
}

export function importedProgramClientUrl(clientId: number): string {
  return `/clients/${clientId}?imported=1&tab=workouts`;
}
