'use client';

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ExerciseLibraryExercise } from '@/lib/api';
import { touchActionClass } from '@/lib/touch-targets';

interface ArchiveExerciseDialogProps {
  exercise: ExerciseLibraryExercise | null;
  archiving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ArchiveExerciseDialog({
  exercise,
  archiving,
  onOpenChange,
  onConfirm,
}: ArchiveExerciseDialogProps) {
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => {
    setConfirmName('');
  }, [exercise?.id]);

  const nameMatches =
    exercise !== null &&
    confirmName.trim().toLowerCase() === exercise.name.trim().toLowerCase();

  return (
    <AlertDialog
      open={exercise !== null}
      onOpenChange={(open) => {
        if (!open && !archiving) onOpenChange(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive this exercise?</AlertDialogTitle>
          <AlertDialogDescription>
            {exercise
              ? `Type the exercise name to confirm. "${exercise.name}" will be hidden from new workouts.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {exercise ? (
          <div className="space-y-2 py-2">
            <Label htmlFor="archive-confirm-name">
              Type &quot;{exercise.name}&quot; to confirm
            </Label>
            <Input
              id="archive-confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameMatches && !archiving) {
                  e.preventDefault();
                  onConfirm();
                }
              }}
              placeholder={exercise.name}
              autoComplete="off"
              aria-invalid={confirmName.length > 0 && !nameMatches}
              disabled={archiving}
            />
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            className={touchActionClass}
            disabled={archiving || !nameMatches}
            onClick={onConfirm}
          >
            {archiving ? 'Archiving…' : 'Archive exercise'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
