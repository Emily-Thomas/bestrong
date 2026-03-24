'use client';

import { Check, Frown, Meh, Plus, Smile, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { ActualExercisePerformance, ExerciseRound } from '@/lib/api';

interface ExerciseInputModalProps {
  exercise: ActualExercisePerformance;
  proposedExercise?: {
    name: string;
    sets?: number;
    reps?: string | number;
    weight?: string;
    rir?: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<ActualExercisePerformance>) => void;
  exerciseIndex: number;
  totalExercises: number;
}

export function ExerciseInputModal({
  exercise,
  proposedExercise,
  open,
  onOpenChange,
  onUpdate,
  exerciseIndex,
  totalExercises,
}: ExerciseInputModalProps) {
  const [showRounds, setShowRounds] = useState(
    exercise.rounds && exercise.rounds.length > 0
  );

  // Initialize rounds if not present
  const rounds = exercise.rounds || [];

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
      // If no proposed exercise, just add one empty round
      addRound();
      return;
    }

    const numSets = proposedExercise.sets || 1;
    const proposedReps = proposedExercise.reps;
    const proposedWeight = proposedExercise.weight;

    // Create rounds based on number of sets
    const newRounds: ExerciseRound[] = [];
    for (let i = 0; i < numSets; i++) {
      newRounds.push({
        round_number: i + 1,
        reps: proposedReps ? String(proposedReps) : undefined,
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
    // Renumber rounds
    const renumberedRounds = newRounds.map((r, i) => ({
      ...r,
      round_number: i + 1,
    }));
    onUpdate({ rounds: renumberedRounds });
    if (renumberedRounds.length === 0) {
      setShowRounds(false);
    }
  };

  const setExerciseRating = (rating: 'happy' | 'meh' | 'sad') => {
    onUpdate({ exercise_rating: rating });
  };

  const handleDone = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-screen max-h-screen flex flex-col p-0 gap-0 m-0 rounded-none border-0 sm:max-w-4xl sm:h-[95vh] sm:max-h-[95vh] sm:rounded-lg sm:border sm:m-4">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">
                {exercise.exercise_name}
              </DialogTitle>
              {proposedExercise && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-sm">
                    {proposedExercise.sets && `${proposedExercise.sets} sets`}
                  </Badge>
                  {proposedExercise.reps && (
                    <Badge variant="outline" className="text-sm">
                      {proposedExercise.reps} reps
                    </Badge>
                  )}
                  {proposedExercise.weight && (
                    <Badge variant="outline" className="text-sm">
                      {proposedExercise.weight}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {exerciseIndex + 1} of {totalExercises}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Quick Input Mode - Simple reps and weight */}
          {!showRounds && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label
                  htmlFor={`reps-${exerciseIndex}`}
                  className="text-lg font-semibold"
                >
                  Total Reps Completed
                </Label>
                <Input
                  id={`reps-${exerciseIndex}`}
                  type="text"
                  value={exercise.reps_completed || ''}
                  onChange={(e) => onUpdate({ reps_completed: e.target.value })}
                  placeholder="e.g., 8-10 or 8"
                  className="h-14 text-xl"
                />
              </div>
              <div className="space-y-3">
                <Label
                  htmlFor={`weight-${exerciseIndex}`}
                  className="text-lg font-semibold"
                >
                  Weight/Load Used
                </Label>
                <Input
                  id={`weight-${exerciseIndex}`}
                  type="text"
                  value={exercise.weight_used || ''}
                  onChange={(e) => onUpdate({ weight_used: e.target.value })}
                  placeholder="e.g., 185 lbs"
                  className="h-14 text-xl"
                />
              </div>
            </div>
          )}

          {/* Per-Round Input Mode */}
          {showRounds && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Round Details</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={addRound}
                  className="h-12"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Round
                </Button>
              </div>

              {rounds.map((round, roundIndex) => (
                <div
                  key={roundIndex}
                  className="p-5 border-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">
                      Round {round.round_number}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRound(roundIndex)}
                      className="h-10 w-10 p-0"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`round-${exerciseIndex}-${roundIndex}-reps`}
                        className="text-base"
                      >
                        Reps
                      </Label>
                      <Input
                        id={`round-${exerciseIndex}-${roundIndex}-reps`}
                        type="text"
                        value={round.reps || ''}
                        onChange={(e) =>
                          updateRound(roundIndex, { reps: e.target.value })
                        }
                        placeholder="e.g., 8"
                        className="h-12 text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor={`round-${exerciseIndex}-${roundIndex}-weight`}
                        className="text-base"
                      >
                        Weight
                      </Label>
                      <Input
                        id={`round-${exerciseIndex}-${roundIndex}-weight`}
                        type="text"
                        value={round.weight || ''}
                        onChange={(e) =>
                          updateRound(roundIndex, { weight: e.target.value })
                        }
                        placeholder="e.g., 185 lbs"
                        className="h-12 text-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {rounds.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-lg">
                  No rounds added yet. Click "Add Round" to track per-round
                  data.
                </div>
              )}
            </div>
          )}

          {/* Toggle between simple and per-round mode */}
          <div className="flex justify-center py-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                if (!showRounds) {
                  // If rounds already exist, just show them
                  // Otherwise, initialize with proposed exercise data
                  if (rounds.length > 0) {
                    setShowRounds(true);
                  } else {
                    initializeRoundsFromProposed();
                  }
                } else {
                  setShowRounds(false);
                }
              }}
              className="h-12"
            >
              {showRounds ? 'Switch to Simple Mode' : 'Track Per-Round Data'}
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Exercise Feedback */}
          <div className="space-y-6">
            <Label className="text-xl font-semibold">
              How did this exercise go?
            </Label>
            <div className="flex gap-6 justify-center py-4">
              <Button
                type="button"
                variant={
                  exercise.exercise_rating === 'happy' ? 'default' : 'outline'
                }
                size="lg"
                onClick={() => setExerciseRating('happy')}
                className="h-20 w-20 rounded-full p-0"
              >
                <Smile className="h-10 w-10" />
              </Button>
              <Button
                type="button"
                variant={
                  exercise.exercise_rating === 'meh' ? 'default' : 'outline'
                }
                size="lg"
                onClick={() => setExerciseRating('meh')}
                className="h-20 w-20 rounded-full p-0"
              >
                <Meh className="h-10 w-10" />
              </Button>
              <Button
                type="button"
                variant={
                  exercise.exercise_rating === 'sad' ? 'default' : 'outline'
                }
                size="lg"
                onClick={() => setExerciseRating('sad')}
                className="h-20 w-20 rounded-full p-0"
              >
                <Frown className="h-10 w-10" />
              </Button>
            </div>

            <div className="space-y-3">
              <Label
                htmlFor={`exercise-notes-${exerciseIndex}`}
                className="text-lg font-semibold"
              >
                Notes (what went right or wrong)
              </Label>
              <Textarea
                id={`exercise-notes-${exerciseIndex}`}
                value={exercise.exercise_notes || ''}
                onChange={(e) => onUpdate({ exercise_notes: e.target.value })}
                placeholder="Optional: Add notes about this exercise..."
                rows={4}
                className="text-lg"
              />
            </div>
          </div>
        </div>

        {/* Footer with Done button */}
        <div className="px-6 py-4 border-t flex-shrink-0 flex justify-end">
          <Button onClick={handleDone} size="lg" className="h-12 px-8 text-lg">
            <Check className="mr-2 h-5 w-5" />
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
