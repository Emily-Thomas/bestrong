'use client';

import { STANDALONE_BLOCK_SHELL_CLASS } from '@/components/workout/exercise-group-visuals';
import { Checkbox } from '@/components/ui/checkbox';
import type { Exercise } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ExerciseRow } from './ExerciseRow';

interface StandaloneExerciseBlockProps {
  exercise: Exercise;
  index: number;
  compactPrescription?: boolean;
  sessionExercises: Exercise[];
  onSessionExercisesChange: (exercises: Exercise[]) => void;
  selectedForLink: boolean;
  onToggleSelectForLink: (index: number) => void;
  onUpdateAtIndex: (index: number, updates: Partial<Exercise>) => void;
  onReplaceAtIndex: (index: number) => void;
  onRemoveAtIndex: (index: number) => void;
}

export function StandaloneExerciseBlock({
  exercise,
  index,
  compactPrescription,
  sessionExercises,
  onSessionExercisesChange,
  selectedForLink,
  onToggleSelectForLink,
  onUpdateAtIndex,
  onReplaceAtIndex,
  onRemoveAtIndex,
}: StandaloneExerciseBlockProps) {
  const label = exercise.name?.trim() || `Movement ${index + 1}`;

  return (
    <li className="list-none">
      <section
        className={cn(
          STANDALONE_BLOCK_SHELL_CLASS,
          'transition-shadow',
          selectedForLink &&
            'ring-2 ring-primary ring-offset-2 ring-offset-background'
        )}
        aria-label={`Single movement ${index + 1}: ${label}`}
      >
        <div className="flex items-center gap-3 border-b border-border bg-muted/20 px-4 py-2.5 sm:px-5">
          <Checkbox
            id={`link-select-${index}`}
            checked={selectedForLink}
            onCheckedChange={() => onToggleSelectForLink(index)}
            aria-label={`Select ${label} for linking`}
          />
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-bold text-foreground"
            aria-hidden
          >
            {index + 1}
          </span>
          <label
            htmlFor={`link-select-${index}`}
            className="min-w-0 flex-1 cursor-pointer text-xs text-muted-foreground"
          >
            Select to link with other movements
          </label>
        </div>
        <ExerciseRow
          exercise={exercise}
          index={index}
          compactPrescription={compactPrescription}
          sessionExercises={sessionExercises}
          onSessionExercisesChange={onSessionExercisesChange}
          onUpdateAtIndex={onUpdateAtIndex}
          onReplaceAtIndex={onReplaceAtIndex}
          onRemoveAtIndex={onRemoveAtIndex}
        />
      </section>
    </li>
  );
}
