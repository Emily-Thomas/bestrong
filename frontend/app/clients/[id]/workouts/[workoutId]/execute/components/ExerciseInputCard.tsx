'use client';

import { Frown, Meh, Plus, Smile, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { ActualExercisePerformance, ExerciseRound } from '@/lib/api';

interface ExerciseInputCardProps {
  exercise: ActualExercisePerformance;
  proposedExercise?: {
    name: string;
    sets?: number;
    reps?: string | number;
    weight?: string;
    rir?: number;
  };
  onUpdate: (updates: Partial<ActualExercisePerformance>) => void;
  exerciseIndex: number;
}

export function ExerciseInputCard({
  exercise,
  proposedExercise,
  onUpdate,
  exerciseIndex,
}: ExerciseInputCardProps) {
  const [showRounds, setShowRounds] = useState(
    exercise.rounds && exercise.rounds.length > 0
  );

  // Initialize rounds if not present
  const rounds = exercise.rounds || [];
  const _numSets = proposedExercise?.sets || exercise.sets_completed || 1;

  const addRound = () => {
    const newRound: ExerciseRound = {
      round_number: rounds.length + 1,
    };
    onUpdate({
      rounds: [...rounds, newRound],
    });
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">
            {exercise.exercise_name}
          </CardTitle>
          {proposedExercise && (
            <Badge variant="outline" className="text-xs">
              {proposedExercise.sets && `${proposedExercise.sets} sets`}
              {proposedExercise.reps && ` • ${proposedExercise.reps} reps`}
              {proposedExercise.weight && ` • ${proposedExercise.weight}`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Input Mode - Simple reps and weight */}
        {!showRounds && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`reps-${exerciseIndex}`} className="text-base">
                Total Reps Completed
              </Label>
              <Input
                id={`reps-${exerciseIndex}`}
                type="text"
                value={exercise.reps_completed || ''}
                onChange={(e) => onUpdate({ reps_completed: e.target.value })}
                placeholder="e.g., 8-10 or 8"
                className="h-12 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`weight-${exerciseIndex}`} className="text-base">
                Weight/Load Used
              </Label>
              <Input
                id={`weight-${exerciseIndex}`}
                type="text"
                value={exercise.weight_used || ''}
                onChange={(e) => onUpdate({ weight_used: e.target.value })}
                placeholder="e.g., 185 lbs"
                className="h-12 text-lg"
              />
            </div>
          </div>
        )}

        {/* Per-Round Input Mode */}
        {showRounds && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Round Details</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRound}
                className="h-9"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Round
              </Button>
            </div>

            {rounds.map((round, roundIndex) => (
              <Card key={roundIndex} className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Round {round.round_number}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRound(roundIndex)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`round-${exerciseIndex}-${roundIndex}-reps`}
                        className="text-sm"
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
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor={`round-${exerciseIndex}-${roundIndex}-weight`}
                        className="text-sm"
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
                        className="h-11"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {rounds.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No rounds added yet. Click "Add Round" to track per-round data.
              </div>
            )}
          </div>
        )}

        {/* Toggle between simple and per-round mode */}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (!showRounds) {
                // Initialize with one round
                addRound();
              } else {
                setShowRounds(false);
              }
            }}
            className="h-10"
          >
            {showRounds ? 'Switch to Simple Mode' : 'Track Per-Round Data'}
          </Button>
        </div>

        <Separator />

        {/* Exercise Feedback */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">
            How did this exercise go?
          </Label>
          <div className="flex gap-4 justify-center">
            <Button
              type="button"
              variant={
                exercise.exercise_rating === 'happy' ? 'default' : 'outline'
              }
              size="lg"
              onClick={() => setExerciseRating('happy')}
              className="h-16 w-16 rounded-full p-0"
            >
              <Smile className="h-8 w-8" />
            </Button>
            <Button
              type="button"
              variant={
                exercise.exercise_rating === 'meh' ? 'default' : 'outline'
              }
              size="lg"
              onClick={() => setExerciseRating('meh')}
              className="h-16 w-16 rounded-full p-0"
            >
              <Meh className="h-8 w-8" />
            </Button>
            <Button
              type="button"
              variant={
                exercise.exercise_rating === 'sad' ? 'default' : 'outline'
              }
              size="lg"
              onClick={() => setExerciseRating('sad')}
              className="h-16 w-16 rounded-full p-0"
            >
              <Frown className="h-8 w-8" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor={`exercise-notes-${exerciseIndex}`}
              className="text-base"
            >
              Notes (what went right or wrong)
            </Label>
            <Textarea
              id={`exercise-notes-${exerciseIndex}`}
              value={exercise.exercise_notes || ''}
              onChange={(e) => onUpdate({ exercise_notes: e.target.value })}
              placeholder="Optional: Add notes about this exercise..."
              rows={3}
              className="text-base"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
