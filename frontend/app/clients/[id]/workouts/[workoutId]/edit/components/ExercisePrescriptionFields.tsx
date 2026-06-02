'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Exercise } from '@/lib/api';

interface ExercisePrescriptionFieldsProps {
  exercise: Exercise;
  index: number;
  onChange: (updates: Partial<Exercise>) => void;
}

export function ExercisePrescriptionFields({
  exercise,
  index,
  onChange,
}: ExercisePrescriptionFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`sets-${index}`}>Sets</Label>
        <Input
          id={`sets-${index}`}
          type="number"
          min={0}
          value={exercise.sets ?? ''}
          onChange={(e) =>
            onChange({
              sets: e.target.value ? parseInt(e.target.value, 10) : undefined,
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`reps-${index}`}>Reps</Label>
        <Input
          id={`reps-${index}`}
          value={
            exercise.reps !== undefined && exercise.reps !== null
              ? String(exercise.reps)
              : ''
          }
          onChange={(e) => onChange({ reps: e.target.value || undefined })}
          placeholder="e.g., 8-10 or 8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`weight-${index}`}>Weight / load</Label>
        <Input
          id={`weight-${index}`}
          value={exercise.weight || ''}
          onChange={(e) => onChange({ weight: e.target.value || undefined })}
          placeholder="e.g., RIR 2 or 185 lbs"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`rest-${index}`}>Rest (seconds)</Label>
        <Input
          id={`rest-${index}`}
          type="number"
          min={0}
          value={exercise.rest_seconds ?? ''}
          onChange={(e) =>
            onChange({
              rest_seconds: e.target.value
                ? parseInt(e.target.value, 10)
                : undefined,
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`tempo-${index}`}>Tempo</Label>
        <Input
          id={`tempo-${index}`}
          value={exercise.tempo ?? ''}
          onChange={(e) => onChange({ tempo: e.target.value || undefined })}
          placeholder="e.g., 3-0-1-0"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`rir-${index}`}>RIR (0-5)</Label>
        <Input
          id={`rir-${index}`}
          type="number"
          min={0}
          max={5}
          value={exercise.rir !== undefined ? exercise.rir : ''}
          onChange={(e) =>
            onChange({
              rir: e.target.value ? parseInt(e.target.value, 10) : undefined,
            })
          }
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`notes-${index}`}>Notes</Label>
        <Textarea
          id={`notes-${index}`}
          value={exercise.notes || ''}
          onChange={(e) => onChange({ notes: e.target.value || undefined })}
          placeholder="Exercise-specific notes..."
          rows={2}
        />
      </div>
    </div>
  );
}
