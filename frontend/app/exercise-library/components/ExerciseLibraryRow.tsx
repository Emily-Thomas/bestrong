'use client';

import { Archive, Pencil } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ExerciseLibraryExercise } from '@/lib/api';
import { touchActionClass } from '@/lib/touch-targets';
import { cn } from '@/lib/utils';
import { formatExerciseDefaults } from '../lib/exercise-form';

/** Shared with list column header — keeps action icons aligned in the grid */
export const LIBRARY_ROW_ACTIONS_CLASS =
  'sm:grid-cols-[minmax(0,1fr)_4.75rem]';

interface ExerciseLibraryRowProps {
  exercise: ExerciseLibraryExercise;
  isEditing?: boolean;
  onEdit: (exercise: ExerciseLibraryExercise) => void;
  onRequestArchive: (exercise: ExerciseLibraryExercise) => void;
}

function RowActionButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-9 w-9 shrink-0', touchActionClass, className)}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

function ExerciseLibraryRowComponent({
  exercise,
  isEditing = false,
  onEdit,
  onRequestArchive,
}: ExerciseLibraryRowProps) {
  const defaults = formatExerciseDefaults(exercise);
  const subtitle = [exercise.primary_muscle_group, exercise.equipment]
    .filter(Boolean)
    .join(' · ');
  const isArchived = exercise.status === 'archived';

  return (
    <li>
      <div
        className={cn(
          'grid grid-cols-1 items-stretch transition-colors motion-reduce:transition-none',
          LIBRARY_ROW_ACTIONS_CLASS,
          isEditing && 'bg-primary/[0.08]'
        )}
      >
        <button
          type="button"
          aria-current={isEditing ? 'true' : undefined}
          className={cn(
            'min-w-0 px-4 py-3 text-left transition-colors motion-reduce:transition-none sm:px-5 sm:py-3.5',
            'hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            touchActionClass,
            isEditing && 'hover:bg-primary/[0.1]'
          )}
          onClick={() => onEdit(exercise)}
        >
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate text-sm font-semibold leading-snug text-foreground">
                {exercise.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {subtitle || 'Muscle group not set'}
              </p>
              {defaults ? (
                <p className="font-mono text-xs text-muted-foreground">{defaults}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:flex-col sm:items-end">
              {exercise.category ? (
                <Badge variant="outline" className="text-xs font-normal">
                  {exercise.category}
                </Badge>
              ) : null}
              <span className="text-xs font-medium text-muted-foreground">
                {isArchived ? 'Archived' : 'Active'}
              </span>
            </div>
          </div>
          {exercise.notes ? (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {exercise.notes}
            </p>
          ) : null}
          {isEditing ? (
            <span className="sr-only">Currently editing</span>
          ) : null}
        </button>

        <fieldset
          className={cn(
            'm-0 flex min-w-0 items-center justify-center gap-0.5 border-0 border-t border-border bg-muted/15 p-0 px-2 py-1.5',
            'sm:border-l sm:border-t-0 sm:bg-transparent sm:px-1 sm:py-0'
          )}
        >
          <legend className="sr-only">Actions for {exercise.name}</legend>
          <RowActionButton
            label={`Edit ${exercise.name}`}
            onClick={() => onEdit(exercise)}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </RowActionButton>
          {!isArchived ? (
            <RowActionButton
              label={`Archive ${exercise.name}`}
              onClick={() => onRequestArchive(exercise)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Archive className="h-4 w-4" aria-hidden />
            </RowActionButton>
          ) : null}
        </fieldset>
      </div>
    </li>
  );
}

export const ExerciseLibraryRow = memo(ExerciseLibraryRowComponent);
