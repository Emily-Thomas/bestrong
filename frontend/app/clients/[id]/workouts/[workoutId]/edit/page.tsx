'use client';

import { ArrowLeft, BookOpen, Library, Loader2, PenLine, Save } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import {
  type Exercise,
  type ExerciseLibraryExercise,
  type Workout,
  type WorkoutData,
  workoutsApi,
} from '@/lib/api';
import { ExerciseLibraryPicker } from './components/ExerciseLibraryPicker';
import { ExercisePrescriptionFields } from './components/ExercisePrescriptionFields';
import {
  exerciseFromLibrary,
  isLibraryLinkedExercise,
} from './lib/exercise-from-library';

type PickerTarget = { type: 'new' } | { type: 'replace'; index: number };

export default function EditWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = Number(params.id);
  const workoutId = Number(params.workoutId);

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutReasoning, setWorkoutReasoning] = useState('');
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  const clientBackHref = (() => {
    const q = new URLSearchParams();
    const tab = searchParams.get('tab');
    if (tab) q.set('tab', tab);
    if (
      searchParams.get('imported') === '1' ||
      searchParams.get('track') === 'imported_program'
    ) {
      q.set('imported', '1');
    }
    const qs = q.toString();
    return qs ? `/clients/${clientId}?${qs}` : `/clients/${clientId}`;
  })();

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
    } catch (_err) {
      setError('Failed to load workout');
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    if (workoutId) {
      void loadWorkout();
    }
  }, [workoutId, loadWorkout]);

  const updateExercise = (index: number, updates: Partial<Exercise>) => {
    if (!workoutData) return;
    const newExercises = [...workoutData.exercises];
    newExercises[index] = { ...newExercises[index], ...updates };
    setWorkoutData({ ...workoutData, exercises: newExercises });
  };

  const openLibraryPicker = (target: PickerTarget) => {
    setPickerTarget(target);
    setLibraryPickerOpen(true);
  };

  const handleLibrarySelect = (lib: ExerciseLibraryExercise) => {
    if (!workoutData || !pickerTarget) return;

    if (pickerTarget.type === 'new') {
      setWorkoutData({
        ...workoutData,
        exercises: [...workoutData.exercises, exerciseFromLibrary(lib)],
      });
    } else {
      const prev = workoutData.exercises[pickerTarget.index];
      const newExercises = [...workoutData.exercises];
      newExercises[pickerTarget.index] = exerciseFromLibrary(lib, prev ?? {});
      setWorkoutData({ ...workoutData, exercises: newExercises });
    }
    setPickerTarget(null);
  };

  const addCustomExercise = () => {
    if (!workoutData) return;
    const newExercise: Exercise = {
      name: '',
      sets: 3,
      reps: '8-10',
      is_custom: true,
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

    const unnamed = workoutData.exercises.some(
      (ex) => !ex.name?.trim()
    );
    if (unnamed) {
      setError('Every exercise needs a name. Pick from the library or enter a custom name.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await workoutsApi.update(workout.id, {
        workout_name: workoutName || undefined,
        workout_data: workoutData,
        workout_reasoning: workoutReasoning || undefined,
      });
      if (response.success) {
        router.push(clientBackHref);
      } else {
        setError(response.error || 'Failed to update workout');
      }
    } catch (_err) {
      setError('Failed to update workout');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Edit workout" description="Loading session">
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading workout...
              </p>
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!workout || !workoutData) {
    return (
      <ProtectedRoute>
        <AppShell
          title="Edit workout"
          description="We couldn't find that session"
        >
          <Card className="max-w-md shadow-md">
            <CardContent className="py-12 text-center text-muted-foreground">
              Workout not found. It may have been removed.
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (workout.status === 'completed') {
    return (
      <ProtectedRoute>
        <AppShell
          title="Edit workout"
          description="This session is already logged"
        >
          <Card className="max-w-md shadow-md">
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">
                This workout is completed, so the plan can&apos;t be changed
                here. View the session to see what was logged.
              </p>
              <Button variant="outline" asChild>
                <Link href={`/clients/${clientId}/workouts/${workoutId}`}>
                  View workout
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
        description="Add movements from your exercise library, then set sets and load"
        backAction={
          <Button variant="ghost" size="sm" asChild>
            <Link href={clientBackHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to client
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

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Workout Details</CardTitle>
              <CardDescription>
                Week {workout.week_number} · Session {workout.session_number}
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

          <Card className="shadow-md">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Exercises</CardTitle>
                  <CardDescription>
                    Choose from your library so prescriptions stay consistent
                    across clients.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="gap-2"
                    type="button"
                    onClick={() => openLibraryPicker({ type: 'new' })}
                  >
                    <BookOpen className="h-4 w-4" />
                    Add from library
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    className="gap-2"
                    onClick={addCustomExercise}
                  >
                    <PenLine className="h-4 w-4" />
                    Add custom
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {workoutData.exercises.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
                  <Library className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <p className="mt-3 text-sm font-medium text-foreground">
                    No exercises yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start with{' '}
                    <span className="font-medium text-foreground">
                      Add from library
                    </span>{' '}
                    to pull from your roster. Use custom only when the movement
                    is not in the library.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-4 gap-2"
                    onClick={() => openLibraryPicker({ type: 'new' })}
                  >
                    <BookOpen className="h-4 w-4" />
                    Browse exercise library
                  </Button>
                </div>
              ) : (
                workoutData.exercises.map((exercise, index) => {
                  const fromLibrary = isLibraryLinkedExercise(exercise);
                  const meta = exercise.library_metadata;
                  return (
                    <Card
                      key={`ex-${index}-${exercise.library_exercise_id ?? (exercise.name || 'custom')}`}
                      className="border-border/60 shadow-sm"
                    >
                      <CardContent className="space-y-4 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-medium">
                                Exercise {index + 1}
                              </h4>
                              {fromLibrary ? (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 text-xs font-normal"
                                >
                                  <Library className="h-3 w-3" />
                                  Library
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            {fromLibrary ? (
                              <p className="text-sm font-semibold leading-snug text-foreground">
                                {exercise.name}
                              </p>
                            ) : null}
                            {fromLibrary && meta ? (
                              <p className="text-xs text-muted-foreground">
                                {[
                                  meta.primary_muscle_group,
                                  meta.equipment,
                                  meta.category,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              className="gap-1.5"
                              onClick={() =>
                                openLibraryPicker({
                                  type: 'replace',
                                  index,
                                })
                              }
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              {fromLibrary ? 'Change' : 'Pick from library'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => removeExercise(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>

                        {!fromLibrary ? (
                          <div className="space-y-2">
                            <Label htmlFor={`exercise-name-${index}`}>
                              Exercise name
                            </Label>
                            <Input
                              id={`exercise-name-${index}`}
                              value={exercise.name}
                              onChange={(e) =>
                                updateExercise(index, {
                                  name: e.target.value,
                                  is_custom: true,
                                })
                              }
                              placeholder="e.g., Barbell Bench Press"
                            />
                          </div>
                        ) : null}

                        <ExercisePrescriptionFields
                          exercise={exercise}
                          index={index}
                          onChange={(updates) =>
                            updateExercise(index, updates)
                          }
                        />
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(clientBackHref)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </div>

        <ExerciseLibraryPicker
          open={libraryPickerOpen}
          onOpenChange={(open) => {
            setLibraryPickerOpen(open);
            if (!open) setPickerTarget(null);
          }}
          onSelect={handleLibrarySelect}
        />
      </AppShell>
    </ProtectedRoute>
  );
}
