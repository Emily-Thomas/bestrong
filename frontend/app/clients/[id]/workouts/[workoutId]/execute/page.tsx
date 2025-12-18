'use client';

import { ArrowLeft, Loader2, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  type ActualExercisePerformance,
  type ActualWorkoutPerformance,
  type CreateActualWorkoutInput,
  type Workout,
  workoutsApi,
} from '@/lib/api';

export default function WorkoutExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);
  const workoutId = Number(params.workoutId);

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [actualPerformance, setActualPerformance] = useState<ActualWorkoutPerformance>({
    exercises: [],
  });
  const [sessionNotes, setSessionNotes] = useState('');
  const [overallRPE, setOverallRPE] = useState<number>(5);
  const [clientEnergyLevel, setClientEnergyLevel] = useState<number>(5);
  const [trainerObservations, setTrainerObservations] = useState('');

  const loadWorkout = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await workoutsApi.getById(workoutId);
      if (response.success && response.data) {
        const w = response.data;
        setWorkout(w);

        // Initialize actual performance with proposed exercises
        if (w.workout_data.exercises) {
          const exercises: ActualExercisePerformance[] = w.workout_data.exercises.map(
            (ex) => ({
              exercise_name: ex.name,
              sets_completed: ex.sets,
              reps_completed: typeof ex.reps === 'number' ? ex.reps : ex.reps || '',
              weight_used: ex.weight || '',
              rpe: ex.rpe,
            })
          );
          setActualPerformance({ exercises });
        }

        // If actual workout exists, load it
        if (w.actual_workout) {
          setActualPerformance(w.actual_workout.actual_performance);
          setSessionNotes(w.actual_workout.session_notes || '');
          setOverallRPE(w.actual_workout.overall_rpe || 5);
          setClientEnergyLevel(w.actual_workout.client_energy_level || 5);
          setTrainerObservations(w.actual_workout.trainer_observations || '');
        }
      } else {
        setError(response.error || 'Failed to load workout');
      }
    } catch (err) {
      setError('Failed to load workout');
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    if (workoutId) {
      loadWorkout();
    }
  }, [workoutId, loadWorkout]);

  const updateExercisePerformance = (
    index: number,
    updates: Partial<ActualExercisePerformance>
  ) => {
    const newExercises = [...actualPerformance.exercises];
    newExercises[index] = { ...newExercises[index], ...updates };
    setActualPerformance({ ...actualPerformance, exercises: newExercises });
  };

  const removeExercise = (index: number) => {
    const newExercises = actualPerformance.exercises.filter((_, i) => i !== index);
    setActualPerformance({ ...actualPerformance, exercises: newExercises });
  };

  const handleSave = async (complete: boolean) => {
    if (!workout) return;

    // Validation
    if (actualPerformance.exercises.length === 0) {
      setError('Please record performance for at least one exercise');
      return;
    }

    // Validate that exercise names match
    const exerciseNames = workout.workout_data.exercises.map((e) => e.name);
    const actualExerciseNames = actualPerformance.exercises.map((e) => e.exercise_name);
    const missingExercises = exerciseNames.filter(
      (name) => !actualExerciseNames.includes(name)
    );
    if (missingExercises.length > 0) {
      setError(
        `Missing performance data for: ${missingExercises.join(', ')}. Please record data for all exercises or remove exercises you didn't do.`
      );
      return;
    }

    setSaving(true);
    setError('');

    const input: CreateActualWorkoutInput = {
      workout_id: workout.id,
      actual_performance: actualPerformance,
      session_notes: sessionNotes,
      overall_rpe: overallRPE,
      client_energy_level: clientEnergyLevel,
      trainer_observations: trainerObservations,
      completed_at: new Date().toISOString(),
    };

    try {
      if (complete) {
        const response = await workoutsApi.complete(workout.id, input);
        if (response.success) {
          router.push(`/clients/${clientId}`);
        } else {
          setError(response.error || 'Failed to complete workout');
        }
      } else {
        // For draft, we'd need a separate endpoint or just update the workout status
        // For now, we'll just complete it
        const response = await workoutsApi.complete(workout.id, input);
        if (response.success) {
          router.push(`/clients/${clientId}`);
        } else {
          setError(response.error || 'Failed to save workout');
        }
      }
    } catch (err) {
      setError('Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Execute Workout" description="Loading workout...">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!workout) {
    return (
      <ProtectedRoute>
        <AppShell title="Execute Workout" description="Workout not found">
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              Workout not found
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell
        title={workout.workout_name || `Week ${workout.week_number}, Session ${workout.session_number}`}
        description="Record actual workout performance"
        backAction={
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/clients/${clientId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Client
            </Link>
          </Button>
        }
      >
        <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

          {/* Proposed Workout Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Proposed Workout Plan</CardTitle>
              <CardDescription>
                Week {workout.week_number} • Session {workout.session_number}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workout.workout_data.warmup && workout.workout_data.warmup.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Warmup</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {workout.workout_data.warmup.map((ex, idx) => (
                      <li key={idx}>{ex.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Exercises</h4>
                <div className="space-y-3">
                  {workout.workout_data.exercises.map((ex, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="font-medium">{ex.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {ex.sets && <span>{ex.sets} sets</span>}
                        {ex.reps && <span> • {ex.reps} reps</span>}
                        {ex.weight && <span> • {ex.weight}</span>}
                        {ex.rpe && <span> • RPE {ex.rpe}</span>}
                      </div>
                      {ex.notes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {ex.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {workout.workout_data.cooldown && workout.workout_data.cooldown.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Cooldown</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {workout.workout_data.cooldown.map((ex, idx) => (
                      <li key={idx}>{ex.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actual Performance Input */}
          <Card>
            <CardHeader>
              <CardTitle>Actual Performance</CardTitle>
              <CardDescription>Record what the client actually did</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exercise Performance */}
              <div>
                <h4 className="font-semibold mb-4">Exercise Performance</h4>
                <div className="space-y-4">
                  {actualPerformance.exercises.map((ex, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{ex.exercise_name}</div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeExercise(idx)}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`sets-${idx}`}>Sets Completed</Label>
                            <Input
                              id={`sets-${idx}`}
                              type="number"
                              min="0"
                              value={ex.sets_completed || ''}
                              onChange={(e) =>
                                updateExercisePerformance(idx, {
                                  sets_completed: e.target.value
                                    ? parseInt(e.target.value, 10)
                                    : undefined,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`reps-${idx}`}>Reps Completed</Label>
                            <Input
                              id={`reps-${idx}`}
                              value={ex.reps_completed || ''}
                              onChange={(e) =>
                                updateExercisePerformance(idx, {
                                  reps_completed: e.target.value,
                                })
                              }
                              placeholder="e.g., 8-10 or 8"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`weight-${idx}`}>Weight/Load Used</Label>
                            <Input
                              id={`weight-${idx}`}
                              value={ex.weight_used || ''}
                              onChange={(e) =>
                                updateExercisePerformance(idx, {
                                  weight_used: e.target.value,
                                })
                              }
                              placeholder="e.g., 185 lbs or RPE 8"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`rpe-${idx}`}>
                              RPE (1-10): {ex.rpe || 5}
                            </Label>
                            <Slider
                              id={`rpe-${idx}`}
                              min={1}
                              max={10}
                              step={1}
                              value={[ex.rpe || 5]}
                              onValueChange={([value]) =>
                                updateExercisePerformance(idx, { rpe: value })
                              }
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor={`notes-${idx}`}>Exercise Notes</Label>
                            <Textarea
                              id={`notes-${idx}`}
                              value={ex.notes || ''}
                              onChange={(e) =>
                                updateExercisePerformance(idx, {
                                  notes: e.target.value,
                                })
                              }
                              placeholder="Any notes about this exercise..."
                              rows={2}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Session-Level Inputs */}
              <div className="space-y-4">
                <h4 className="font-semibold">Session Summary</h4>

                <div className="space-y-2">
                  <Label>Overall Session RPE (1-10): {overallRPE}</Label>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[overallRPE]}
                    onValueChange={([value]) => setOverallRPE(value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Client Energy Level (1-10): {clientEnergyLevel}</Label>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[clientEnergyLevel]}
                    onValueChange={([value]) => setClientEnergyLevel(value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-notes">Session Notes</Label>
                  <Textarea
                    id="session-notes"
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Overall session notes..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trainer-observations">Trainer Observations</Label>
                  <Textarea
                    id="trainer-observations"
                    value={trainerObservations}
                    onChange={(e) => setTrainerObservations(e.target.value)}
                    placeholder="What did you observe? How did the client perform? Any concerns or highlights?"
                    rows={4}
                  />
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/clients/${clientId}`)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  variant="outline"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft
                    </>
                  )}
                </Button>
                <Button onClick={() => handleSave(true)} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save & Complete
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

