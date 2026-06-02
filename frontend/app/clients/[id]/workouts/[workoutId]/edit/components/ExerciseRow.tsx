'use client';

import { BookOpen, Library } from 'lucide-react';
import { memo, useCallback, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Exercise } from '@/lib/api';
import { cn } from '@/lib/utils';
import { touchActionClass } from '@/lib/touch-targets';
import { WORKOUT_EXERCISE_ROW_GRID } from '../lib/edit-ui-classes';
import { isLibraryLinkedExercise } from '../lib/exercise-from-library';
import { ExercisePrescriptionFields } from './ExercisePrescriptionFields';

interface ExerciseRowProps {
  exercise: Exercise;
  index: number;
  compactPrescription?: boolean;
  onUpdateAtIndex: (index: number, updates: Partial<Exercise>) => void;
  onReplaceAtIndex: (index: number) => void;
  onRemoveAtIndex: (index: number) => void;
}

function RowToolbarButton({
  label,
  onClick,
  variant = 'outline',
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  variant?: 'outline' | 'ghost';
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      className={cn('h-9 shrink-0 gap-1.5', touchActionClass, className)}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ExerciseRowComponent({
  exercise,
  index,
  compactPrescription = false,
  onUpdateAtIndex,
  onReplaceAtIndex,
  onRemoveAtIndex,
}: ExerciseRowProps) {
  const fromLibrary = isLibraryLinkedExercise(exercise);
  const meta = exercise.library_metadata;
  const displayName =
    exercise.name?.trim() ||
    (fromLibrary ? 'Library movement' : 'Unnamed movement');

  const handleUpdate = useCallback(
    (updates: Partial<Exercise>) => onUpdateAtIndex(index, updates),
    [index, onUpdateAtIndex]
  );

  const handleReplace = useCallback(
    () => onReplaceAtIndex(index),
    [index, onReplaceAtIndex]
  );

  const handleRemove = useCallback(
    () => onRemoveAtIndex(index),
    [index, onRemoveAtIndex]
  );

  const replaceLabel = fromLibrary
    ? `Change ${displayName}`
    : `Pick ${displayName} from library`;

  return (
    <article aria-label={`Exercise ${index + 1}: ${displayName}`}>
      <div
        className={cn(
          'grid grid-cols-1 items-stretch',
          WORKOUT_EXERCISE_ROW_GRID
        )}
      >
        <div className="min-w-0 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold leading-snug text-foreground">
              {displayName}
            </h3>
            {fromLibrary ? (
              <Badge variant="secondary" className="gap-1 text-xs font-normal">
                <Library className="h-3 w-3" aria-hidden />
                Library
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-normal">
                Custom
              </Badge>
            )}
          </div>
          {fromLibrary && meta ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {[meta.primary_muscle_group, meta.equipment, meta.category]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Movement {index + 1}
            </p>
          )}
        </div>

        <fieldset
          className={cn(
            'm-0 flex min-w-0 items-center justify-end gap-1.5 border-0 border-t border-border bg-muted/15 p-0 px-3 py-2',
            'sm:justify-center sm:border-l sm:border-t-0 sm:bg-transparent sm:px-4 sm:py-0'
          )}
        >
          <legend className="sr-only">Actions for {displayName}</legend>
          <RowToolbarButton label={replaceLabel} onClick={handleReplace}>
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">
              {fromLibrary ? 'Change' : 'From library'}
            </span>
          </RowToolbarButton>
          <RowToolbarButton
            label={`Remove ${displayName}`}
            onClick={handleRemove}
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <span className="text-sm">Remove</span>
          </RowToolbarButton>
        </fieldset>
      </div>

      <div className="border-t border-border/80 bg-muted/10 px-4 py-4 sm:px-5 sm:py-4">
        {!fromLibrary ? (
          <div className="mb-4 space-y-2">
            <Label htmlFor={`exercise-name-${index}`}>Exercise name</Label>
            <Input
              id={`exercise-name-${index}`}
              value={exercise.name}
              onChange={(e) =>
                handleUpdate({
                  name: e.target.value,
                  is_custom: true,
                })
              }
              placeholder="e.g., Barbell bench press"
            />
          </div>
        ) : null}

        <ExercisePrescriptionFields
          exercise={exercise}
          index={index}
          compact={compactPrescription}
          onChange={handleUpdate}
        />
      </div>
    </article>
  );
}

export const ExerciseRow = memo(ExerciseRowComponent);
