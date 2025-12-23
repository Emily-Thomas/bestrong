'use client';

import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Textarea } from '@/components/ui/textarea';
import {
  type Workout,
  type WorkoutData,
  type Exercise,
  workoutsApi,
} from '@/lib/api';

export default function EditWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);
  const workoutId = Number(params.workoutId);

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutReasoning, setWorkoutReasoning] = useState('');

  const loadWorkout = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await workoutsApi.getById(workoutId);
      if (response.success && response.data) {
        const w = response.data;
        setWorkout(w);
        setWorkoutData(w.workout_data);
        setWorkoutName(w.workout_name || '');
        setWorkoutReasoning(w.workout_reasoning || '');
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

  const updateExercise = (index: number, updates: Partial<Exercise>) => {
    if (!workoutData) return;
    const newExercises = [...workoutData.exercises];
    newExercises[index] = { ...newExercises[index], ...updates };
    setWorkoutData({ ...workoutData, exercises: newExercises });
  };

  const addExercise = () => {
    if (!workoutData) return;
    const newExercise: Exercise = {
      name: '',
      sets: 3,
      reps: '8-10',
    };
    setWorkoutData({
      ...workoutData,
      exercises: [...workoutData.exercises, newExercise],
    });
  };

  const removeExercise = (index: number) => {
    if (!workoutData) return;
    const newExercises = workoutData.exercises.filter((_, i) => i !== index);
    setWorkoutData({ ...workoutData, exercises: newExercises });
  };

  const handleSave = async () => {
    if (!workout || !workoutData) return;

    setSaving(true);
    setError('');

    try {
      const response = await workoutsApi.update(workout.id, {
        workout_name: workoutName || undefined,
        workout_data: workoutData,
        workout_reasoning: workoutReasoning || undefined,
      });
      if (response.success) {
        router.push(`/clients/${clientId}`);
      } else {
        setError(response.error || 'Failed to update workout');
      }
    } catch (err) {
      setError('Failed to update workout');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Edit Workout" description="Loading workout...">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!workout || !workoutData) {
    return (
      <ProtectedRoute>
        <AppShell title="Edit Workout" description="Workout not found">
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              Workout not found
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (workout.status === 'completed') {
    return (
      <ProtectedRoute>
        <AppShell title="Edit Workout" description="Cannot edit completed workout">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                This workout has been completed and cannot be edited.
              </p>
              <Button variant="outline" asChild>
                <Link href={`/clients/${clientId}/workouts/${workoutId}`}>
                  View Workout Details
                </Link>
              </Button>
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell
        title={`Edit: ${workoutName || `Week ${workout.week_number}, Session ${workout.session_number}`}`}
        description="Modify workout plan"
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
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Workout Details</CardTitle>
              <CardDescription>
                Week {workout.week_number} • Session {workout.session_number}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workout-name">Workout Name</Label>
                <Input
                  id="workout-name"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="e.g., Upper Body Strength"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workout-reasoning">Workout Reasoning</Label>
                <Textarea
                  id="workout-reasoning"
                  value={workoutReasoning}
                  onChange={(e) => setWorkoutReasoning(e.target.value)}
                  placeholder="Why this workout was designed..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Exercises</CardTitle>
                  <CardDescription>Modify exercise details</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={addExercise}>
                  Add Exercise
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {workoutData.exercises.map((exercise, index) => (
                <Card key={index}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Exercise {index + 1}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeExercise(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`exercise-name-${index}`}>Exercise Name</Label>
                        <Input
                          id={`exercise-name-${index}`}
                          value={exercise.name}
                          onChange={(e) =>
                            updateExercise(index, { name: e.target.value })
                          }
                          placeholder="e.g., Barbell Bench Press"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`sets-${index}`}>Sets</Label>
                        <Input
                          id={`sets-${index}`}
                          type="number"
                          min="0"
                          value={exercise.sets || ''}
                          onChange={(e) =>
                            updateExercise(index, {
                              sets: e.target.value ? parseInt(e.target.value, 10) : undefined,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`reps-${index}`}>Reps</Label>
                        <Input
                          id={`reps-${index}`}
                          value={exercise.reps || ''}
                          onChange={(e) =>
                            updateExercise(index, { reps: e.target.value })
                          }
                          placeholder="e.g., 8-10 or 8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`weight-${index}`}>Weight/Load</Label>
                        <Input
                          id={`weight-${index}`}
                          value={exercise.weight || ''}
                          onChange={(e) =>
                            updateExercise(index, { weight: e.target.value })
                          }
                          placeholder="e.g., RIR 2 or 185 lbs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`rest-${index}`}>Rest (seconds)</Label>
                        <Input
                          id={`rest-${index}`}
                          type="number"
                          min="0"
                          value={exercise.rest_seconds || ''}
                          onChange={(e) =>
                            updateExercise(index, {
                              rest_seconds: e.target.value
                                ? parseInt(e.target.value, 10)
                                : undefined,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`rir-${index}`}>RIR (0-5)</Label>
                        <Input
                          id={`rir-${index}`}
                          type="number"
                          min="0"
                          max="5"
                          value={exercise.rir !== undefined ? exercise.rir : ''}
                          onChange={(e) =>
                            updateExercise(index, {
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
                          onChange={(e) =>
                            updateExercise(index, { notes: e.target.value })
                          }
                          placeholder="Exercise-specific notes..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/clients/${clientId}`)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

