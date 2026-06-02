'use client';

import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Exercise } from '@/lib/api';
import { touchActionClass } from '@/lib/touch-targets';

function hasAdvancedPrescription(exercise: Exercise): boolean {
  return Boolean(
    exercise.weight?.trim() ||
      exercise.tempo?.trim() ||
      exercise.rir !== undefined ||
      exercise.notes?.trim()
  );
}

interface ExercisePrescriptionFieldsProps {
  exercise: Exercise;
  index: number;
  onChange: (updates: Partial<Exercise>) => void;
  /** Imported program: sets/reps/rest first, rest under More */
  compact?: boolean;
}

export function ExercisePrescriptionFields({
  exercise,
  index,
  onChange,
  compact = false,
}: ExercisePrescriptionFieldsProps) {
  const showAdvancedByDefault = useMemo(
    () => !compact || hasAdvancedPrescription(exercise),
    [compact, exercise]
  );
  const [moreOpen, setMoreOpen] = useState(showAdvancedByDefault);

  const primaryFields = (
    <>
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
    </>
  );

  const advancedFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor={`weight-${index}`}>Weight / load</Label>
        <Input
          id={`weight-${index}`}
          value={exercise.weight || ''}
          onChange={(e) => onChange({ weight: e.target.value || undefined })}
          placeholder="e.g., 185 lbs or %1RM"
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
    </>
  );

  if (!compact) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {primaryFields}
        {advancedFields}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-3">{primaryFields}</div>
      <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'gap-1 px-2 text-muted-foreground',
              touchActionClass
            )}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                moreOpen && 'rotate-180'
              )}
            />
            More options
            {hasAdvancedPrescription(exercise) ? (
              <span className="text-xs text-foreground">(has values)</span>
            ) : null}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="grid gap-4 pt-2 sm:grid-cols-2">
          {advancedFields}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
