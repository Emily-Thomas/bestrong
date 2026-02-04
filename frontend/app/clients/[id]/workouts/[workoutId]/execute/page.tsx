'use client';

import { ArrowLeft, Loader2, Save, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  type ActualExercisePerformance,
  type ActualWorkoutPerformance,
  type CreateActualWorkoutInput,
  type Workout,
  workoutsApi,
  clientsApi,
} from '@/lib/api';
import { ExerciseInputModal } from './components/ExerciseInputModal';
import { WorkoutRatingSection } from './components/WorkoutRatingSection';
import { PreWorkoutSurvey, type PreWorkoutSurveyResponse } from './components/PreWorkoutSurvey';

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
  const [trainerObservations, setTrainerObservations] = useState('');
  const [workoutRating, setWorkoutRating] = useState<'happy' | 'meh' | 'sad' | undefined>();
  const [openExerciseIndex, setOpenExerciseIndex] = useState<number | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyResponse, setSurveyResponse] = useState<PreWorkoutSurveyResponse | null>(null);
  const [clientName, setClientName] = useState<string>('');

  const loadWorkout = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Load client data for survey
      const clientResponse = await clientsApi.getById(clientId);
      if (clientResponse.success && clientResponse.data) {
        const client = clientResponse.data;
        setClientName(`${client.first_name} ${client.last_name}`);
      }

      const response = await workoutsApi.getById(workoutId);
      if (response.success && response.data) {
        const w = response.data;
        setWorkout(w);

        // Initialize actual performance with proposed exercises
        // Only set exercise_name - don't pre-populate actual performance data
        if (w.workout_data.exercises) {
          const exercises: ActualExercisePerformance[] = w.workout_data.exercises.map(
            (ex) => ({
              exercise_name: ex.name,
              // Don't pre-populate reps_completed, weight_used, etc.
              // These should only be set when trainer actually records data
            })
          );
          setActualPerformance({ exercises });
        }

        // If actual workout exists, load it
        if (w.actual_workout) {
          setActualPerformance(w.actual_workout.actual_performance);
          setSessionNotes(w.actual_workout.session_notes || '');
          setTrainerObservations(w.actual_workout.trainer_observations || '');
          setWorkoutRating(w.actual_workout.workout_rating);
          // Don't show survey if workout already exists
        } else {
          // Show survey for new workouts
          setShowSurvey(true);
        }
      } else {
        setError(response.error || 'Failed to load workout');
      }
    } catch (err) {
      setError('Failed to load workout');
    } finally {
      setLoading(false);
    }
  }, [workoutId, clientId]);

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

  const handleSave = async (complete: boolean) => {
    if (!workout) return;

    // Validation
    if (actualPerformance.exercises.length === 0) {
      setError('Please record performance for at least one exercise');
      return;
    }

    setSaving(true);
    setError('');

    const input: CreateActualWorkoutInput = {
      workout_id: workout.id,
      actual_performance: actualPerformance,
      session_notes: sessionNotes,
      trainer_observations: trainerObservations,
      workout_rating: workoutRating,
      completed_at: new Date().toISOString(),
    };

    try {
      const response = await workoutsApi.complete(workout.id, input);
      if (response.success) {
        router.push(`/clients/${clientId}`);
      } else {
        setError(response.error || 'Failed to save workout');
      }
    } catch (err) {
      setError('Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  const getExerciseStatus = (exercise: ActualExercisePerformance) => {
    // Check if user has actually entered meaningful data
    // Empty strings don't count as data
    const hasReps = exercise.reps_completed && String(exercise.reps_completed).trim() !== '';
    const hasWeight = exercise.weight_used && String(exercise.weight_used).trim() !== '';
    const hasRounds = exercise.rounds && exercise.rounds.length > 0 && 
      exercise.rounds.some(r => 
        (r.reps && String(r.reps).trim() !== '') || 
        (r.weight && String(r.weight).trim() !== '')
      );
    const hasRating = exercise.exercise_rating !== undefined;
    const hasNotes = exercise.exercise_notes && exercise.exercise_notes.trim() !== '';
    
    // Exercise is only completed if user has entered at least one piece of actual data
    const hasData = hasReps || hasWeight || hasRounds || hasRating || hasNotes;
    
    if (hasData) {
      return 'completed';
    }
    return 'pending';
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
        description="Record workout performance"
        backAction={
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/clients/${clientId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      >
        <div className="max-w-4xl mx-auto space-y-6 pb-8">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Pre-Workout Survey Summary */}
          {surveyResponse && (
            <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Pre-Workout Assessment</CardTitle>
                  <Badge 
                    variant={
                      getConcernLevel(surveyResponse) === 'high' ? 'destructive' :
                      getConcernLevel(surveyResponse) === 'medium' ? 'default' :
                      getConcernLevel(surveyResponse) === 'low' ? 'secondary' : 'outline'
                    }
                  >
                    {getConcernLevel(surveyResponse) === 'high' ? 'High Concern' :
                     getConcernLevel(surveyResponse) === 'medium' ? 'Moderate Concern' :
                     getConcernLevel(surveyResponse) === 'low' ? 'Low Concern' : 'All Good'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Recovery:</strong> {formatResponseValue(surveyResponse.recovery)}</div>
                <div><strong>Rest:</strong> {formatResponseValue(surveyResponse.rest)}</div>
                <div><strong>Mood:</strong> {formatResponseValue(surveyResponse.mood)}</div>
                <div><strong>Injuries:</strong> {formatResponseValue(surveyResponse.injuries)}</div>
                {surveyResponse.injuryDetails && (
                  <div className="pt-2 border-t">
                    <strong>Injury Details:</strong> {surveyResponse.injuryDetails}
                  </div>
                )}
                {surveyResponse.notes && (
                  <div className="pt-2 border-t">
                    <strong>Notes:</strong> {surveyResponse.notes}
                  </div>
                )}
                {(getConcernLevel(surveyResponse) === 'medium' || getConcernLevel(surveyResponse) === 'high') && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Consider modifying today's workout based on the client's current state. You may want to reduce intensity, volume, or change exercises.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Proposed Workout Plan - Compact */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Workout Plan</CardTitle>
              <CardDescription>
                Week {workout.week_number} • Session {workout.session_number}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workout.workout_data.warmup && workout.workout_data.warmup.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Warmup</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {workout.workout_data.warmup.map((ex, idx) => (
                      <li key={idx}>{ex.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {workout.workout_data.cooldown && workout.workout_data.cooldown.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Cooldown</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {workout.workout_data.cooldown.map((ex, idx) => (
                      <li key={idx}>{ex.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exercise List - Clickable Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Exercises</h2>
              <Badge variant="outline" className="text-sm">
                {actualPerformance.exercises.filter(ex => getExerciseStatus(ex) === 'completed').length} / {actualPerformance.exercises.length} completed
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {actualPerformance.exercises.map((exercise, idx) => {
                const proposedExercise = workout.workout_data.exercises[idx];
                const status = getExerciseStatus(exercise);
                const isOpen = openExerciseIndex === idx;

                return (
                  <div key={idx}>
                    <Card 
                      className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
                        status === 'completed' 
                          ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' 
                          : 'border-border hover:border-primary'
                      }`}
                      onClick={() => setOpenExerciseIndex(idx)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex-shrink-0">
                              {status === 'completed' ? (
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                              ) : (
                                <Circle className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-semibold mb-2">
                                {exercise.exercise_name}
                              </h3>
                              {proposedExercise && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {proposedExercise.sets && (
                                    <Badge variant="outline" className="text-xs">
                                      {proposedExercise.sets} sets
                                    </Badge>
                                  )}
                                  {proposedExercise.reps && (
                                    <Badge variant="outline" className="text-xs">
                                      {proposedExercise.reps} reps
                                    </Badge>
                                  )}
                                  {proposedExercise.weight && (
                                    <Badge variant="outline" className="text-xs">
                                      {proposedExercise.weight}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {status === 'completed' && (
                                <div className="text-sm text-muted-foreground space-y-1">
                                  {exercise.reps_completed && (
                                    <div>Reps: {exercise.reps_completed}</div>
                                  )}
                                  {exercise.weight_used && (
                                    <div>Weight: {exercise.weight_used}</div>
                                  )}
                                  {exercise.rounds && exercise.rounds.length > 0 && (
                                    <div>{exercise.rounds.length} round(s) tracked</div>
                                  )}
                                  {exercise.exercise_rating && (
                                    <div className="capitalize">Rating: {exercise.exercise_rating}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-4">
                            <Button variant="outline" size="lg" className="h-12 px-6">
                              {status === 'completed' ? 'Edit' : 'Record'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Exercise Input Modal */}
                    <ExerciseInputModal
                      exercise={exercise}
                      proposedExercise={proposedExercise}
                      open={isOpen}
                      onOpenChange={(open) => {
                        if (!open) {
                          setOpenExerciseIndex(null);
                        } else {
                          setOpenExerciseIndex(idx);
                        }
                      }}
                      onUpdate={(updates) => updateExercisePerformance(idx, updates)}
                      exerciseIndex={idx}
                      totalExercises={actualPerformance.exercises.length}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="my-8" />

          {/* Overall Workout Feedback */}
          <WorkoutRatingSection
            workoutRating={workoutRating}
            trainerObservations={trainerObservations}
            sessionNotes={sessionNotes}
            onRatingChange={setWorkoutRating}
            onObservationsChange={setTrainerObservations}
            onSessionNotesChange={setSessionNotes}
          />

          {/* Action Buttons - Tablet Optimized */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              variant="outline"
              onClick={() => router.push(`/clients/${clientId}`)}
              disabled={saving}
              className="h-12 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="h-12 text-base flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Save & Complete Workout
                </>
              )}
            </Button>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
