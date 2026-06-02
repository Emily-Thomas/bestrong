'use client';

import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { type ExerciseLibraryExercise } from '@/lib/api';
import { cn } from '@/lib/utils';
import { touchActionClass } from '@/lib/touch-targets';
import { fetchExerciseLibrary } from '@/lib/exercise-library-cache';

interface ExerciseLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: ExerciseLibraryExercise) => void;
}

function formatDefaultPrescription(exercise: ExerciseLibraryExercise): string | null {
  const parts: string[] = [];
  if (
    exercise.default_sets !== undefined &&
    exercise.default_reps !== undefined
  ) {
    parts.push(`${exercise.default_sets}×${exercise.default_reps}`);
  }
  if (exercise.default_load) parts.push(exercise.default_load);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function ExerciseLibraryPicker({
  open,
  onOpenChange,
  onSelect,
}: ExerciseLibraryPickerProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exercises, setExercises] = useState<ExerciseLibraryExercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 200);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setDebouncedSearch('');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const data = await fetchExerciseLibrary('active');
      if (!cancelled) {
        setExercises(data);
        setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filteredExercises = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (ex.status === 'archived') return false;
      if (!term) return true;
      return (
        ex.name.toLowerCase().includes(term) ||
        (ex.primary_muscle_group || '').toLowerCase().includes(term) ||
        (ex.equipment || '').toLowerCase().includes(term) ||
        (ex.category || '').toLowerCase().includes(term) ||
        (ex.notes || '').toLowerCase().includes(term)
      );
    });
  }, [exercises, debouncedSearch]);

  const handleSelect = (exercise: ExerciseLibraryExercise) => {
    onSelect(exercise);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b px-4 py-4">
          <DialogTitle className="text-lg">Pick from library</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-4 py-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-8"
              placeholder="Search name, muscle, equipment…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              aria-label="Search exercise library"
            />
          </div>

          {loading ? (
            <p
              className="py-8 text-center text-sm text-muted-foreground"
              aria-live="polite"
            >
              Loading your exercise library…
            </p>
          ) : filteredExercises.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No active exercises match. Add movements in Exercise Library
              first.
            </div>
          ) : (
            <ul
              className="max-h-[min(420px,55vh)] overflow-y-auto rounded-md border divide-y"
              aria-label="Exercise library results"
            >
              {filteredExercises.map((exercise) => {
                const defaults = formatDefaultPrescription(exercise);
                const subtitle = [
                  exercise.primary_muscle_group,
                  exercise.equipment,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li key={exercise.id}>
                    <button
                      type="button"
                      className="flex min-h-11 w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:min-h-0"
                      onClick={() => handleSelect(exercise)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {exercise.name}
                        </p>
                        {subtitle ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {subtitle}
                          </p>
                        ) : null}
                        {defaults ? (
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {defaults}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs font-medium text-primary">
                        Add
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className={cn('w-full', touchActionClass)}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
