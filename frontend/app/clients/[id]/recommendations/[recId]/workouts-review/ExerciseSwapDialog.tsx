'use client';

import { BookOpen, Library, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  type Exercise,
  type ExerciseLibraryExercise,
  exerciseLibraryApi,
} from '@/lib/api';
import { ExerciseLibraryPicker } from '../../../workouts/[workoutId]/edit/components/ExerciseLibraryPicker';

function exerciseFromLibrary(
  lib: ExerciseLibraryExercise,
  prev: Exercise
): Exercise {
  return {
    ...prev,
    name: lib.name,
    library_exercise_id: lib.id,
    library_exercise_name: lib.name,
    is_custom: false,
    sets: prev.sets ?? lib.default_sets ?? undefined,
    reps:
      prev.reps ?? (lib.default_reps != null ? lib.default_reps : undefined),
    weight: prev.weight ?? lib.default_load ?? undefined,
    rest_seconds: prev.rest_seconds ?? lib.default_rest_seconds ?? undefined,
    tempo: prev.tempo ?? lib.default_tempo ?? undefined,
    library_metadata: {
      primary_muscle_group: lib.primary_muscle_group,
      secondary_muscle_groups: lib.secondary_muscle_groups,
      movement_pattern: lib.movement_pattern,
      equipment: lib.equipment,
      category: lib.category,
    },
  };
}

export interface ExerciseSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentExercise: Exercise;
  onSelect: (exercise: Exercise) => void;
}

export function ExerciseSwapDialog({
  open,
  onOpenChange,
  currentExercise,
  onSelect,
}: ExerciseSwapDialogProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [similar, setSimilar] = useState<ExerciseLibraryExercise[]>([]);

  useEffect(() => {
    if (!open || !currentExercise.library_exercise_id) {
      setSimilar([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await exerciseLibraryApi.getSimilar(
        currentExercise.library_exercise_id as number
      );
      if (!cancelled && res.success && res.data) {
        setSimilar(res.data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, currentExercise.library_exercise_id]);

  const handlePick = (lib: ExerciseLibraryExercise) => {
    onSelect(exerciseFromLibrary(lib, currentExercise));
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="grid max-h-[90vh] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="space-y-3 border-b border-border/60 bg-gradient-to-br from-violet-500/[0.08] to-transparent px-6 py-5">
            <div className="flex items-center gap-2 text-primary">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                <RefreshCw className="h-4 w-4" aria-hidden />
              </div>
              <DialogTitle className="text-left text-lg">
                Swap exercise
              </DialogTitle>
            </div>
            <DialogDescription className="text-left text-sm leading-relaxed">
              Replace{' '}
              <span className="font-semibold text-foreground">
                {currentExercise.name}
              </span>{' '}
              with another movement. Presets and load from this session are kept
              when possible.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-5">
            {currentExercise.library_exercise_id != null &&
            similar.length > 0 ? (
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Similar in your library
                </Label>
                <ScrollArea className="mt-2 h-[min(240px,40vh)] pr-3">
                  <div className="flex flex-col gap-2">
                    {similar.map((lib) => (
                      <Button
                        key={lib.id}
                        type="button"
                        variant="outline"
                        className="h-auto justify-start gap-3 border-border/80 py-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                        onClick={() => handlePick(lib)}
                      >
                        <Library className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium leading-snug">
                            {lib.name}
                          </span>
                          {lib.primary_muscle_group ? (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {lib.primary_muscle_group}
                              {lib.equipment ? ` · ${lib.equipment}` : ''}
                            </span>
                          ) : null}
                        </span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 py-6 text-base font-semibold shadow-sm"
              onClick={() => setSearchOpen(true)}
            >
              <BookOpen className="h-4 w-4" />
              Browse full exercise library
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ExerciseLibraryPicker
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={(lib) => {
          handlePick(lib);
          setSearchOpen(false);
        }}
      />
    </>
  );
}
