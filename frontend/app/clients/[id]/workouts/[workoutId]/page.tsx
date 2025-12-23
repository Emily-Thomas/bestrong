'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import {
  type Workout,
  workoutsApi,
} from '@/lib/api';

export default function WorkoutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);
  const workoutId = Number(params.workoutId);

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWorkout = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await workoutsApi.getById(workoutId);
      if (response.success && response.data) {
        setWorkout(response.data);
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

  const getStatusBadge = (status?: Workout['status']) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Workout Details" description="Loading workout...">
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
        <AppShell title="Workout Details" description="Workout not found">
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
        description="Workout details and performance"
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

          {/* Workout Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {workout.workout_name || `Week ${workout.week_number}, Session ${workout.session_number}`}
                  </CardTitle>
                  <CardDescription>
                    Week {workout.week_number} • Session {workout.session_number}
                  </CardDescription>
                </div>
                {getStatusBadge(workout.status)}
              </div>
            </CardHeader>
            <CardContent>
              {workout.workout_reasoning && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Workout Reasoning</h4>
                  <p className="text-sm text-muted-foreground">
                    {workout.workout_reasoning}
                  </p>
                </div>
              )}
              {workout.scheduled_date && (
                <div className="text-sm text-muted-foreground">
                  Scheduled: {new Date(workout.scheduled_date).toLocaleDateString()}
                </div>
              )}
              {workout.completed_at && (
                <div className="text-sm text-muted-foreground">
                  Completed: {new Date(workout.completed_at).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proposed Workout Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Proposed Workout Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workout.workout_data.warmup && workout.workout_data.warmup.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Warmup</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {workout.workout_data.warmup.map((ex, idx) => (
                      <li key={idx}>
                        {ex.name}
                        {ex.notes && <span className="ml-2">- {ex.notes}</span>}
                      </li>
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
                        {ex.rir !== undefined && <span> • RIR {ex.rir}</span>}
                        {ex.rest_seconds && (
                          <span> • {ex.rest_seconds}s rest</span>
                        )}
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
                      <li key={idx}>
                        {ex.name}
                        {ex.notes && <span className="ml-2">- {ex.notes}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actual Performance (if completed) */}
          {workout.actual_workout && (
            <Card>
              <CardHeader>
                <CardTitle>Actual Performance</CardTitle>
                <CardDescription>What the client actually did</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {workout.actual_workout.overall_rir !== undefined && (
                  <div>
                    <span className="font-semibold">Overall Session RIR: </span>
                    {workout.actual_workout.overall_rir}/5
                  </div>
                )}
                {workout.actual_workout.client_energy_level && (
                  <div>
                    <span className="font-semibold">Client Energy Level: </span>
                    {workout.actual_workout.client_energy_level}/10
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Exercise Performance</h4>
                  <div className="space-y-3">
                    {workout.actual_workout.actual_performance.exercises.map(
                      (ex, idx) => {
                        const proposedEx = workout.workout_data.exercises.find(
                          (e) => e.name === ex.exercise_name
                        );
                        return (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="font-medium">{ex.exercise_name}</div>
                            <div className="grid gap-2 sm:grid-cols-2 mt-2">
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Proposed
                                </div>
                                <div className="text-sm">
                                  {proposedEx?.sets && <span>{proposedEx.sets} sets</span>}
                                  {proposedEx?.reps && (
                                    <span> • {proposedEx.reps} reps</span>
                                  )}
                                  {proposedEx?.weight && (
                                    <span> • {proposedEx.weight}</span>
                                  )}
                                  {proposedEx?.rir !== undefined && (
                                    <span> • RIR {proposedEx.rir}</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Actual
                                </div>
                                <div className="text-sm">
                                  {ex.sets_completed && (
                                    <span>{ex.sets_completed} sets</span>
                                  )}
                                  {ex.reps_completed && (
                                    <span> • {ex.reps_completed} reps</span>
                                  )}
                                  {ex.weight_used && (
                                    <span> • {ex.weight_used}</span>
                                  )}
                                  {ex.rir !== undefined && <span> • RIR {ex.rir}</span>}
                                </div>
                              </div>
                            </div>
                            {ex.notes && (
                              <div className="text-xs text-muted-foreground mt-2">
                                {ex.notes}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                {workout.actual_workout.session_notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Session Notes</h4>
                      <p className="text-sm text-muted-foreground">
                        {workout.actual_workout.session_notes}
                      </p>
                    </div>
                  </>
                )}

                {workout.actual_workout.trainer_observations && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Trainer Observations</h4>
                      <p className="text-sm text-muted-foreground">
                        {workout.actual_workout.trainer_observations}
                      </p>
                    </div>
                  </>
                )}

                {workout.actual_workout.completed_at && (
                  <>
                    <Separator />
                    <div className="text-sm text-muted-foreground">
                      Completed: {new Date(workout.actual_workout.completed_at).toLocaleString()}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

