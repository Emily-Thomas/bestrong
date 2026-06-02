import { type ExerciseLibraryExercise, exerciseLibraryApi } from '@/lib/api';

const CACHE_TTL_MS = 5 * 60 * 1000;

type LibraryStatus = 'active' | 'all';

const cacheByStatus: Partial<
  Record<LibraryStatus, { data: ExerciseLibraryExercise[]; fetchedAt: number }>
> = {};

const inflightByStatus: Partial<
  Record<LibraryStatus, Promise<ExerciseLibraryExercise[]>>
> = {};

export function invalidateExerciseLibraryCache(): void {
  for (const key of Object.keys(cacheByStatus) as LibraryStatus[]) {
    delete cacheByStatus[key];
  }
  for (const key of Object.keys(inflightByStatus) as LibraryStatus[]) {
    delete inflightByStatus[key];
  }
}

export async function fetchExerciseLibrary(
  status: LibraryStatus
): Promise<ExerciseLibraryExercise[]> {
  const cached = cacheByStatus[status];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const inflight = inflightByStatus[status];
  if (inflight) return inflight;

  const request = (async () => {
    try {
      const response = await exerciseLibraryApi.getAll({ status });
      if (response.success && response.data) {
        cacheByStatus[status] = {
          data: response.data,
          fetchedAt: Date.now(),
        };
        return response.data;
      }
      return cacheByStatus[status]?.data ?? [];
    } finally {
      delete inflightByStatus[status];
    }
  })();

  inflightByStatus[status] = request;
  return request;
}

/** @deprecated Use fetchExerciseLibrary('active') */
export async function fetchActiveExerciseLibrary(): Promise<
  ExerciseLibraryExercise[]
> {
  return fetchExerciseLibrary('active');
}

/** @deprecated Use invalidateExerciseLibraryCache */
export function invalidateActiveExerciseLibraryCache(): void {
  invalidateExerciseLibraryCache();
}
