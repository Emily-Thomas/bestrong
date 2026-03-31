'use client';

import {
  Check,
  ChevronDown,
  Frown,
  Meh,
  Plus,
  Smile,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { ActualExercisePerformance, ExerciseRound } from '@/lib/api';
import { cn } from '@/lib/utils';

type Proposed = {
  name: string;
  sets?: number;
  reps?: string | number;
  weight?: string;
  rir?: number;
};

interface ExerciseLogCardProps {
  exercise: ActualExercisePerformance;
  proposedExercise?: Proposed;
  exerciseIndex: number;
  totalExercises: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<ActualExercisePerformance>) => void;
  onGoPrev: () => void;
  onGoNext: () => void;
  status: 'completed' | 'pending';
}

export function hasLoggedData(ex: ActualExercisePerformance): boolean {
  const hasReps =
    ex.reps_completed !== undefined &&
    ex.reps_completed !== null &&
    String(ex.reps_completed).trim() !== '';
  const hasWeight =
    ex.weight_used !== undefined &&
    ex.weight_used !== null &&
    String(ex.weight_used).trim() !== '';
  const hasRounds =
    ex.rounds &&
    ex.rounds.length > 0 &&
    ex.rounds.some(
      (r) =>
        (r.reps !== undefined &&
          r.reps !== null &&
          String(r.reps).trim() !== '') ||
        (r.weight !== undefined &&
          r.weight !== null &&
          String(r.weight).trim() !== '')
    );
  const hasRating = ex.exercise_rating !== undefined;
  const hasNotes =
    ex.exercise_notes !== undefined && ex.exercise_notes.trim() !== '';
  return !!(hasReps || hasWeight || hasRounds || hasRating || hasNotes);
}

export function ExerciseLogCard({
  exercise,
  proposedExercise,
  exerciseIndex,
  totalExercises,
  expanded,
  onToggle,
  onUpdate,
  onGoPrev,
  onGoNext,
  status,
}: ExerciseLogCardProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [showRounds, setShowRounds] = useState(
    () => !!(exercise.rounds && exercise.rounds.length > 0)
  );

  const rounds = exercise.rounds || [];

  useEffect(() => {
    if (expanded && bodyRef.current) {
      bodyRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [expanded]);

  const addRound = () => {
    const newRound: ExerciseRound = {
      round_number: rounds.length + 1,
    };
    onUpdate({
      rounds: [...rounds, newRound],
    });
    setShowRounds(true);
  };

  const initializeRoundsFromProposed = () => {
    if (!proposedExercise) {
      addRound();
      return;
    }
    const numSets = proposedExercise.sets || 1;
    const proposedReps = proposedExercise.reps;
    const proposedWeight = proposedExercise.weight;
    const newRounds: ExerciseRound[] = [];
    for (let i = 0; i < numSets; i++) {
      newRounds.push({
        round_number: i + 1,
        reps: proposedReps !== undefined ? String(proposedReps) : undefined,
        weight: proposedWeight || undefined,
      });
    }
    onUpdate({ rounds: newRounds });
    setShowRounds(true);
  };

  const updateRound = (roundIndex: number, updates: Partial<ExerciseRound>) => {
    const newRounds = [...rounds];
    newRounds[roundIndex] = { ...newRounds[roundIndex], ...updates };
    onUpdate({ rounds: newRounds });
  };

  const removeRound = (roundIndex: number) => {
    const newRounds = rounds.filter((_, i) => i !== roundIndex);
    const renumberedRounds = newRounds.map((r, i) => ({
      ...r,
      round_number: i + 1,
    }));
    onUpdate({ rounds: renumberedRounds });
    if (renumberedRounds.length === 0) {
      setShowRounds(false);
    }
  };

  const applyPrescriptionSimple = () => {
    if (!proposedExercise) return;
    onUpdate({
      reps_completed:
        proposedExercise.reps !== undefined
          ? String(proposedExercise.reps)
          : exercise.reps_completed,
      weight_used: proposedExercise.weight ?? exercise.weight_used,
    });
  };

  const setExerciseRating = (rating: 'happy' | 'meh' | 'sad') => {
    onUpdate({ exercise_rating: rating });
  };

  const setsPlanned = proposedExercise?.sets ?? 0;

  return (
    <div
      ref={bodyRef}
      className={cn(
        'rounded-2xl border-2 bg-card shadow-sm transition-shadow',
        status === 'completed'
          ? 'border-emerald-500/70 bg-emerald-500/[0.06]'
          : 'border-border hover:border-primary/40',
        expanded && 'ring-2 ring-primary/30 shadow-md'
      )}
    >
      <button
        type="button"
        className="flex w-full items-start gap-3 p-4 text-left sm:p-5 min-h-[4.5rem] touch-manipulation"
        onClick={onToggle}
      >
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-current bg-background">
          {status === 'completed' ? (
            <Check className="h-5 w-5 text-emerald-600" strokeWidth={2.5} />
          ) : (
            <span className="text-sm font-bold tabular-nums text-muted-foreground">
              {exerciseIndex + 1}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold leading-tight sm:text-xl">
              {exercise.exercise_name}
            </h3>
            {status === 'completed' && (
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                Logged
              </Badge>
            )}
          </div>
          {proposedExercise && (
            <div className="flex flex-wrap gap-2">
              {proposedExercise.sets !== undefined && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {proposedExercise.sets} sets
                </Badge>
              )}
              {proposedExercise.reps !== undefined && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {proposedExercise.reps} reps
                </Badge>
              )}
              {proposedExercise.weight !== undefined && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {proposedExercise.weight}
                </Badge>
              )}
              {proposedExercise.rir !== undefined && (
                <Badge variant="outline" className="text-xs">
                  RIR {proposedExercise.rir}
                </Badge>
              )}
            </div>
          )}
        </div>
        <ChevronDown
          className={cn(
            'mt-1 h-7 w-7 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-border/80 px-4 pb-5 pt-4 sm:px-5">
          {proposedExercise && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="h-12 min-h-[48px] touch-manipulation"
                onClick={applyPrescriptionSimple}
              >
                Use prescription (quick)
              </Button>
              {setsPlanned > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 min-h-[48px] touch-manipulation"
                  onClick={() => {
                    if (rounds.length > 0) {
                      setShowRounds(true);
                    } else {
                      initializeRoundsFromProposed();
                    }
                  }}
                >
                  Set up {setsPlanned} sets
                </Button>
              )}
            </div>
          )}

          {!showRounds && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor={`reps-${exerciseIndex}`}
                  className="text-base font-semibold"
                >
                  Reps (total or range)
                </Label>
                <Input
                  id={`reps-${exerciseIndex}`}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  value={
                    exercise.reps_completed !== undefined &&
                    exercise.reps_completed !== null
                      ? String(exercise.reps_completed)
                      : ''
                  }
                  onChange={(e) => onUpdate({ reps_completed: e.target.value })}
                  placeholder={
                    proposedExercise?.reps !== undefined
                      ? `e.g. ${proposedExercise.reps}`
                      : '8 or 8–10'
                  }
                  className="h-14 min-h-[52px] text-xl"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor={`weight-${exerciseIndex}`}
                  className="text-base font-semibold"
                >
                  Weight / load
                </Label>
                <Input
                  id={`weight-${exerciseIndex}`}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={exercise.weight_used ?? ''}
                  onChange={(e) => onUpdate({ weight_used: e.target.value })}
                  placeholder={
                    proposedExercise?.weight
                      ? String(proposedExercise.weight)
                      : '185 lb'
                  }
                  className="h-14 min-h-[52px] text-xl"
                />
              </div>
            </div>
          )}

          {showRounds && (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Label className="text-base font-semibold">By set</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={addRound}
                  className="h-12 min-h-[48px] w-full touch-manipulation sm:w-auto"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add set
                </Button>
              </div>

              {rounds.map((round, roundIndex) => (
                <div
                  key={`${exerciseIndex}-r-${round.round_number}-${roundIndex}`}
                  className="rounded-xl border-2 border-border/80 bg-muted/20 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-base font-bold">
                      Set {round.round_number}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 touch-manipulation"
                      onClick={() => removeRound(roundIndex)}
                      aria-label="Remove set"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`round-${exerciseIndex}-${roundIndex}-reps`}
                        className="text-sm font-medium"
                      >
                        Reps
                      </Label>
                      <Input
                        id={`round-${exerciseIndex}-${roundIndex}-reps`}
                        type="text"
                        value={
                          round.reps !== undefined ? String(round.reps) : ''
                        }
                        onChange={(e) =>
                          updateRound(roundIndex, { reps: e.target.value })
                        }
                        placeholder="8"
                        className="h-12 min-h-[48px] text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor={`round-${exerciseIndex}-${roundIndex}-weight`}
                        className="text-sm font-medium"
                      >
                        Weight
                      </Label>
                      <Input
                        id={`round-${exerciseIndex}-${roundIndex}-weight`}
                        type="text"
                        inputMode="decimal"
                        value={round.weight ?? ''}
                        onChange={(e) =>
                          updateRound(roundIndex, { weight: e.target.value })
                        }
                        placeholder="185"
                        className="h-12 min-h-[48px] text-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {rounds.length === 0 && (
                <p className="py-6 text-center text-muted-foreground">
                  No sets yet — use &quot;Set up&quot; above or add a set.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-12 min-h-[48px] touch-manipulation"
              onClick={() => {
                if (!showRounds) {
                  if (rounds.length > 0) {
                    setShowRounds(true);
                  } else {
                    initializeRoundsFromProposed();
                  }
                } else {
                  setShowRounds(false);
                }
              }}
            >
              {showRounds
                ? 'Use quick totals instead'
                : 'Log each set separately'}
            </Button>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-base font-semibold">How did it feel?</Label>
            <div className="flex justify-center gap-4 sm:gap-8">
              {(
                [
                  { k: 'happy' as const, Icon: Smile, label: 'Good' },
                  { k: 'meh' as const, Icon: Meh, label: 'OK' },
                  { k: 'sad' as const, Icon: Frown, label: 'Hard' },
                ] as const
              ).map(({ k, Icon, label }) => (
                <Button
                  key={k}
                  type="button"
                  variant={
                    exercise.exercise_rating === k ? 'default' : 'outline'
                  }
                  className={cn(
                    'h-[4.5rem] w-[4.5rem] shrink-0 touch-manipulation flex-col gap-1 rounded-2xl p-0 sm:h-24 sm:w-24',
                    exercise.exercise_rating === k &&
                      'ring-2 ring-primary ring-offset-2'
                  )}
                  onClick={() => setExerciseRating(k)}
                >
                  <Icon className="h-9 w-9 sm:h-10 sm:w-10" />
                  <span className="text-[10px] font-medium sm:text-xs">
                    {label}
                  </span>
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={`exercise-notes-${exerciseIndex}`}
                className="text-sm font-semibold"
              >
                Notes (optional)
              </Label>
              <Textarea
                id={`exercise-notes-${exerciseIndex}`}
                value={exercise.exercise_notes ?? ''}
                onChange={(e) => onUpdate({ exercise_notes: e.target.value })}
                placeholder="Technique, substitutions, pain…"
                rows={2}
                className="min-h-[88px] text-base"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 min-h-[56px] flex-1 touch-manipulation text-base"
              disabled={exerciseIndex === 0}
              onClick={onGoPrev}
            >
              ← Previous
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-14 min-h-[56px] flex-[2] touch-manipulation text-base font-semibold"
              onClick={onGoNext}
            >
              {exerciseIndex >= totalExercises - 1
                ? 'Finish exercise list'
                : 'Next exercise →'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
