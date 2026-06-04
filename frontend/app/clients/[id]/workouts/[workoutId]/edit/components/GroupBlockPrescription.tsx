'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Exercise, ExerciseGroupType } from '@/lib/api';
import {
  groupRoundsLabelCapitalized,
  updateGroupRounds,
} from '@/lib/exercise-groups';

function parseOptionalPositiveInt(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const parsed = parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 1) return undefined;
  return parsed;
}

interface GroupBlockPrescriptionProps {
  groupId: string;
  groupType: ExerciseGroupType;
  groupRounds: number | undefined;
  movementCount: number;
  sessionExercises: Exercise[];
  onSessionExercisesChange: (exercises: Exercise[]) => void;
}

export function GroupBlockPrescription({
  groupId,
  groupType,
  groupRounds,
  movementCount,
  sessionExercises,
  onSessionExercisesChange,
}: GroupBlockPrescriptionProps) {
  const unit = groupRoundsLabelCapitalized(groupType);

  return (
    <div className="grid gap-4 border-b border-border/60 bg-muted/15 px-4 py-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6 sm:px-6">
      <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-1.5">
        <Label
          htmlFor={`group-rounds-${groupId}`}
          className="shrink-0 text-sm font-medium"
        >
          {unit} for block
        </Label>
        <Input
          id={`group-rounds-${groupId}`}
          type="text"
          inputMode="numeric"
          className="h-10 w-20 font-mono tabular-nums"
          value={groupRounds != null ? String(groupRounds) : ''}
          onChange={(e) => {
            const value = parseOptionalPositiveInt(e.target.value);
            onSessionExercisesChange(
              updateGroupRounds(sessionExercises, groupId, value)
            );
          }}
          placeholder="3"
        />
      </div>
      <p className="text-sm text-pretty text-muted-foreground">
        Reps and load for each movement below. Run all {movementCount} movements
        back-to-back, then rest, and repeat for the number of {unit.toLowerCase()}{' '}
        you enter.
      </p>
    </div>
  );
}
