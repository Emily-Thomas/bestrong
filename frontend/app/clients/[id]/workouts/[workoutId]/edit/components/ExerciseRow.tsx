'use client';

import { BookOpen, Library, Unlink } from 'lucide-react';
import { memo, useCallback, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Exercise } from '@/lib/api';
import { cn } from '@/lib/utils';
import { touchActionClass } from '@/lib/touch-targets';
import { GroupStepBadge } from '@/components/workout/exercise-group-visuals';
import {
  EDIT_MOVEMENT_PRESCRIPTION,
  WORKOUT_EXERCISE_ROW_GRID,
} from '../lib/edit-ui-classes';
import { isLibraryLinkedExercise } from '../lib/exercise-from-library';
import { ExerciseLinkMenu } from './ExerciseLinkMenu';
import { ExercisePrescriptionFields } from './ExercisePrescriptionFields';

interface ExerciseRowProps {
  exercise: Exercise;
  index: number;
  compactPrescription?: boolean;
  groupMovementLabel?: string;
  inGroup?: boolean;
  /** Last movement in a linked block (shows rest field) */
  isLastInBlock?: boolean;
  /** Full session list for the Link with… menu */
  sessionExercises?: Exercise[];
  onSessionExercisesChange?: (exercises: Exercise[]) => void;
  onUpdateAtIndex: (index: number, updates: Partial<Exercise>) => void;
  onReplaceAtIndex: (index: number) => void;
  onRemoveAtIndex: (index: number) => void;
  onUnlinkFromGroup?: () => void;
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

function ExerciseRowActions({
  displayName,
  inGroup,
  exercise,
  index,
  fromLibrary,
  sessionExercises,
  onSessionExercisesChange,
  onUnlinkFromGroup,
  replaceLabel,
  handleReplace,
  handleRemove,
}: {
  displayName: string;
  inGroup: boolean;
  exercise: Exercise;
  index: number;
  fromLibrary: boolean;
  sessionExercises?: Exercise[];
  onSessionExercisesChange?: (exercises: Exercise[]) => void;
  onUnlinkFromGroup?: () => void;
  replaceLabel: string;
  handleReplace: () => void;
  handleRemove: () => void;
}) {
  const replaceShort = fromLibrary ? 'Change' : 'From library';
  return (
    <div
      className={cn(
        'flex flex-wrap gap-2',
        inGroup ? 'pt-1' : 'justify-end sm:justify-center'
      )}
    >
      {!inGroup &&
      sessionExercises &&
      onSessionExercisesChange &&
      !exercise.group_id ? (
        <ExerciseLinkMenu
          exercises={sessionExercises}
          index={index}
          onLink={onSessionExercisesChange}
        />
      ) : null}
      {inGroup && onUnlinkFromGroup ? (
        <RowToolbarButton
          label={`Remove ${displayName} from group`}
          onClick={onUnlinkFromGroup}
          variant="ghost"
        >
          <Unlink className="h-3.5 w-3.5" aria-hidden />
          Unlink
        </RowToolbarButton>
      ) : null}
      <RowToolbarButton label={replaceLabel} onClick={handleReplace}>
        <BookOpen className="h-3.5 w-3.5" aria-hidden />
        <span className={cn(!inGroup && 'hidden sm:inline')}>{replaceShort}</span>
        {!inGroup && !fromLibrary ? (
          <span className="sm:hidden">Library</span>
        ) : null}
      </RowToolbarButton>
      <RowToolbarButton
        label={`Remove ${displayName}`}
        onClick={handleRemove}
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        Remove
      </RowToolbarButton>
    </div>
  );
}

function ExerciseRowComponent({
  exercise,
  index,
  compactPrescription = false,
  groupMovementLabel,
  inGroup = false,
  isLastInBlock = false,
  sessionExercises,
  onSessionExercisesChange,
  onUpdateAtIndex,
  onReplaceAtIndex,
  onRemoveAtIndex,
  onUnlinkFromGroup,
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

  const titleBlock = (
    <div className="min-w-0 flex-1 space-y-1">
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
        <p className="truncate text-xs text-muted-foreground">
          {[meta.primary_muscle_group, meta.equipment, meta.category]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : inGroup && groupMovementLabel ? (
        <p className="text-xs text-muted-foreground">
          Step {groupMovementLabel} in this block
        </p>
      ) : null}
    </div>
  );

  if (inGroup) {
    return (
      <article aria-label={`Exercise ${index + 1}: ${displayName}`}>
        <div className="space-y-3 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            {groupMovementLabel ? (
              <GroupStepBadge label={groupMovementLabel} className="mt-0.5" />
            ) : null}
            {titleBlock}
          </div>
          <ExerciseRowActions
            displayName={displayName}
            inGroup
            exercise={exercise}
            index={index}
            fromLibrary={fromLibrary}
            onUnlinkFromGroup={onUnlinkFromGroup}
            replaceLabel={replaceLabel}
            handleReplace={handleReplace}
            handleRemove={handleRemove}
          />
        </div>
        <div className={EDIT_MOVEMENT_PRESCRIPTION}>
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
            hideSets
            hideRest={!isLastInBlock}
            onChange={handleUpdate}
          />
        </div>
      </article>
    );
  }

  return (
    <article aria-label={`Exercise ${index + 1}: ${displayName}`}>
      <div
        className={cn(
          'grid grid-cols-1 items-stretch',
          WORKOUT_EXERCISE_ROW_GRID
        )}
      >
        <div className="min-w-0 px-4 py-3.5 sm:px-5">{titleBlock}</div>
        <div
          className={cn(
            'border-t border-border bg-muted/15 px-4 py-2.5',
            'sm:border-l sm:border-t-0 sm:px-4 sm:py-3.5'
          )}
        >
          <ExerciseRowActions
            displayName={displayName}
            inGroup={false}
            exercise={exercise}
            index={index}
            fromLibrary={fromLibrary}
            sessionExercises={sessionExercises}
            onSessionExercisesChange={onSessionExercisesChange}
            replaceLabel={replaceLabel}
            handleReplace={handleReplace}
            handleRemove={handleRemove}
          />
        </div>
      </div>

      <div className={EDIT_MOVEMENT_PRESCRIPTION}>
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
