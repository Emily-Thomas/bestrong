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

function parseOptionalNonNegativeInt(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : Math.max(0, parsed);
}

function parseOptionalRir(raw: string): number | undefined {
  const parsed = parseOptionalNonNegativeInt(raw);
  if (parsed === undefined) return undefined;
  return Math.min(5, parsed);
}

function formatOptionalInt(value: number | undefined): string {
  return value !== undefined ? String(value) : '';
}

interface OptionalNumericInputProps {
  id: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  parse?: (raw: string) => number | undefined;
}

function OptionalNumericInput({
  id,
  value,
  onChange,
  placeholder,
  parse = parseOptionalNonNegativeInt,
}: OptionalNumericInputProps) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={formatOptionalInt(value)}
      onChange={(e) => onChange(parse(e.target.value))}
      placeholder={placeholder}
    />
  );
}

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
  /** Linked block: sets live on the block, not this movement */
  hideSets?: boolean;
  /** Linked block: rest after the block is on the last movement only */
  hideRest?: boolean;
}

export function ExercisePrescriptionFields({
  exercise,
  index,
  onChange,
  compact = false,
  hideSets = false,
  hideRest = false,
}: ExercisePrescriptionFieldsProps) {
  const showAdvancedByDefault = useMemo(
    () => !compact || hasAdvancedPrescription(exercise),
    [compact, exercise]
  );
  const [moreOpen, setMoreOpen] = useState(showAdvancedByDefault);

  const primaryFields = (
    <>
      {hideSets ? null : (
        <div className="space-y-2">
          <Label htmlFor={`sets-${index}`}>Sets</Label>
          <OptionalNumericInput
            id={`sets-${index}`}
            value={exercise.sets}
            onChange={(sets) => onChange({ sets })}
            placeholder="—"
          />
        </div>
      )}
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
      {hideRest ? (
        <p className="text-xs text-pretty text-muted-foreground sm:col-span-2">
          Rest is set on the last movement in this block.
        </p>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={`rest-${index}`}>Rest (seconds)</Label>
          <OptionalNumericInput
            id={`rest-${index}`}
            value={exercise.rest_seconds}
            onChange={(rest_seconds) => onChange({ rest_seconds })}
            placeholder="—"
          />
        </div>
      )}
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
        <OptionalNumericInput
          id={`rir-${index}`}
          value={exercise.rir}
          onChange={(rir) => onChange({ rir })}
          parse={parseOptionalRir}
          placeholder="—"
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
