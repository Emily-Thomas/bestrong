'use client';

import { Calendar, CheckCircle2, Clock, Play, Loader2, Sparkles, Edit, X, SkipForward, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  type Recommendation,
  type Workout,
  type WeekGenerationJob,
  recommendationsApi,
  workoutsApi,
} from '@/lib/api';

interface WorkoutsSectionProps {
  clientId: number;
  recommendation: Recommendation | null;
  onWorkoutUpdate?: () => void;
}

export function WorkoutsSection({
  clientId,
  recommendation,
  onWorkoutUpdate,
}: WorkoutsSectionProps) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [weekStatus, setWeekStatus] = useState<{
    total_workouts: number;
    completed_workouts: number;
    skipped_workouts?: number;
    in_progress_workouts?: number;
    scheduled_workouts?: number;
    is_complete: boolean;
  } | null>(null);
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [generationJob, setGenerationJob] = useState<WeekGenerationJob | null>(null);
  const [generationError, setGenerationError] = useState('');

  const loadWorkouts = useCallback(async () => {
    if (!recommendation) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await recommendationsApi.getWorkouts(recommendation.id);
      if (response.success && response.data) {
        setWorkouts(response.data);
        const currentWeekNum = recommendation.current_week || 1;
        setCurrentWeek(currentWeekNum);
        
        // Load week status for the current week
        const weekResponse = await recommendationsApi.getWeekStatus(
          recommendation.id,
          currentWeekNum
        );
        if (weekResponse.success && weekResponse.data) {
          setWeekStatus(weekResponse.data);
        } else {
          console.error('Failed to load week status:', weekResponse.error);
        }
      } else {
        setError(response.error || 'Failed to load workouts');
      }
    } catch (err) {
      setError('Failed to load workouts');
      console.error('Error loading workouts:', err);
    } finally {
      setLoading(false);
    }
  }, [recommendation]);

  // Poll for week generation job status
  const pollWeekGenerationJob = useCallback(
    async (jobId: number) => {
      if (!recommendation) return;

      try {
        const response = await recommendationsApi.getWeekGenerationJob(
          recommendation.id,
          jobId
        );

        if (response.success && response.data) {
          const job = response.data;
          setGenerationJob(job);

          if (job.status === 'completed') {
            setGeneratingWeek(false);
            setGenerationJob(null);
            // Reload workouts to show new week
            await loadWorkouts();
            onWorkoutUpdate?.();
          } else if (job.status === 'failed') {
            setGeneratingWeek(false);
            setGenerationError(job.error_message || 'Week generation failed');
          } else if (job.status === 'pending' || job.status === 'processing') {
            // Continue polling (every 15 seconds)
            setTimeout(() => pollWeekGenerationJob(jobId), 15000);
          }
        }
      } catch (err) {
        setGenerationError('Failed to check generation status');
        setGeneratingWeek(false);
      }
    },
    [recommendation, loadWorkouts, onWorkoutUpdate]
  );

  // Check for existing week generation jobs
  const checkForExistingWeekJob = useCallback(async () => {
    if (!recommendation) return;

    try {
      const jobsResponse = await recommendationsApi.getWeekGenerationJobs(
        recommendation.id
      );
      if (jobsResponse.success && jobsResponse.data) {
        const activeJob = jobsResponse.data.find(
          (job) =>
            job.status === 'pending' || job.status === 'processing'
        );
        if (activeJob) {
          setGeneratingWeek(true);
          setGenerationJob(activeJob);
          setTimeout(() => pollWeekGenerationJob(activeJob.id), 1000);
        }
      }
    } catch (err) {
      // Job might not exist, which is fine
    }
  }, [recommendation, pollWeekGenerationJob]);

  useEffect(() => {
    loadWorkouts();
    checkForExistingWeekJob();
  }, [loadWorkouts, checkForExistingWeekJob]);

  // Refresh when recommendation changes (e.g., after activation)
  useEffect(() => {
    if (recommendation) {
      loadWorkouts();
    }
  }, [recommendation?.id, recommendation?.current_week]);

  const handleGenerateNextWeek = async () => {
    if (!recommendation) return;

    // Re-check week status before generating
    const currentWeekNum = recommendation.current_week || 1;
    const weekStatusResponse = await recommendationsApi.getWeekStatus(
      recommendation.id,
      currentWeekNum
    );
    
    if (!weekStatusResponse.success || !weekStatusResponse.data) {
      setGenerationError('Failed to verify week completion status');
      return;
    }

    const latestWeekStatus = weekStatusResponse.data;
    if (!latestWeekStatus.is_complete) {
      setGenerationError(
        `Week ${currentWeekNum} is not complete. ${latestWeekStatus.completed_workouts} of ${latestWeekStatus.total_workouts} workouts completed (${latestWeekStatus.skipped_workouts || 0} skipped).`
      );
      setWeekStatus(latestWeekStatus);
      return;
    }

    const nextWeek = currentWeekNum + 1;
    setGeneratingWeek(true);
    setGenerationError('');

    try {
      const response = await recommendationsApi.generateWeek(
        recommendation.id,
        nextWeek
      );
      if (response.success && response.data) {
        const jobId = response.data.job_id;
        // Start polling
        setTimeout(() => pollWeekGenerationJob(jobId), 1000);
      } else {
        setGenerationError(response.error || 'Failed to start week generation');
        setGeneratingWeek(false);
      }
    } catch (err) {
      setGenerationError('Failed to start week generation');
      setGeneratingWeek(false);
    }
  };

  const handleStartWorkout = async (workoutId: number) => {
    try {
      const response = await workoutsApi.start(workoutId);
      if (response.success) {
        await loadWorkouts();
        onWorkoutUpdate?.();
        router.push(`/clients/${clientId}/workouts/${workoutId}/execute`);
      }
    } catch (err) {
      setError('Failed to start workout');
    }
  };

  const handleContinueWorkout = (workoutId: number) => {
    router.push(`/clients/${clientId}/workouts/${workoutId}/execute`);
  };

  const handleViewWorkout = (workoutId: number) => {
    router.push(`/clients/${clientId}/workouts/${workoutId}`);
  };

  const handleEditWorkout = (workoutId: number) => {
    router.push(`/clients/${clientId}/workouts/${workoutId}/edit`);
  };

  const [skippingWorkout, setSkippingWorkout] = useState<number | null>(null);
  const [cancellingWorkout, setCancellingWorkout] = useState<number | null>(null);

  const handleSkipWorkout = async (workoutId: number) => {
    setSkippingWorkout(workoutId);
    setError('');
    setSuccessMessage('');
    try {
      const response = await workoutsApi.update(workoutId, { status: 'skipped' });
      if (response.success) {
        setSuccessMessage('Workout skipped successfully');
        await loadWorkouts();
        onWorkoutUpdate?.();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.error || 'Failed to skip workout');
      }
    } catch (err) {
      setError('Failed to skip workout');
    } finally {
      setSkippingWorkout(null);
    }
  };

  const handleCancelWorkout = async (workoutId: number) => {
    setCancellingWorkout(workoutId);
    setError('');
    setSuccessMessage('');
    try {
      const response = await workoutsApi.update(workoutId, { status: 'cancelled' });
      if (response.success) {
        setSuccessMessage('Workout cancelled successfully');
        await loadWorkouts();
        onWorkoutUpdate?.();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.error || 'Failed to cancel workout');
      }
    } catch (err) {
      setError('Failed to cancel workout');
    } finally {
      setCancellingWorkout(null);
    }
  };

  const scheduledWorkouts = workouts.filter((w) => w.status === 'scheduled');
  const inProgressWorkouts = workouts.filter((w) => w.status === 'in_progress');
  const completedWorkouts = workouts.filter((w) => w.status === 'completed');
  const skippedWorkouts = workouts.filter((w) => w.status === 'skipped' || w.status === 'cancelled');

  const getStatusBadge = (status: Workout['status']) => {
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

  const WorkoutCard = ({ workout }: { workout: Workout }) => (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold">
                {workout.workout_name || `Week ${workout.week_number}, Session ${workout.session_number}`}
              </h4>
              {getStatusBadge(workout.status)}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Week {workout.week_number} • Session {workout.session_number}
            </p>
            {workout.workout_data.focus_areas && (
              <div className="flex flex-wrap gap-1 mb-2">
                {workout.workout_data.focus_areas.map((area, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            )}
            {workout.scheduled_date && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(workout.scheduled_date).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {workout.status === 'scheduled' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStartWorkout(workout.id)}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </Button>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditWorkout(workout.id)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1"
                        disabled={skippingWorkout === workout.id}
                      >
                        {skippingWorkout === workout.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <SkipForward className="h-3 w-3" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Skip Workout</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to skip this workout? Skipped workouts
                          count toward week completion and can be used to generate the
                          next week.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={skippingWorkout === workout.id}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleSkipWorkout(workout.id)}
                          disabled={skippingWorkout === workout.id}
                        >
                          {skippingWorkout === workout.id ? 'Skipping...' : 'Skip Workout'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
            {workout.status === 'in_progress' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleContinueWorkout(workout.id)}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Continue
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={cancellingWorkout === workout.id}
                    >
                      {cancellingWorkout === workout.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Workout</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel this workout? Cancelled workouts
                        do not count toward week completion. You can start it again later
                        if needed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={cancellingWorkout === workout.id}>
                        Keep Working Out
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleCancelWorkout(workout.id)}
                        disabled={cancellingWorkout === workout.id}
                      >
                        {cancellingWorkout === workout.id ? 'Cancelling...' : 'Cancel Workout'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            {workout.status === 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleViewWorkout(workout.id)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                View
              </Button>
            )}
            {(workout.status === 'skipped' || workout.status === 'cancelled') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleViewWorkout(workout.id)}
              >
                View Details
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!recommendation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workouts</CardTitle>
          <CardDescription>Workout execution and tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No recommendation available. Generate a training plan first.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (recommendation.status !== 'active') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workouts</CardTitle>
          <CardDescription>Workout execution and tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Activate the client and accept the recommendation to start tracking workouts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Workouts</CardTitle>
            <CardDescription>Workout execution and tracking</CardDescription>
          </div>
          {weekStatus && (
            <div className="text-right">
              <div className="text-sm font-medium">
                Week {currentWeek} Progress
              </div>
              <div className="text-xs text-muted-foreground">
                {weekStatus.completed_workouts} / {weekStatus.total_workouts} completed
              </div>
            </div>
          )}
        </div>
        {weekStatus && (
          <Progress
            value={
              weekStatus.total_workouts > 0
                ? (weekStatus.completed_workouts / weekStatus.total_workouts) * 100
                : 0
            }
            className="mt-2"
          />
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {generationError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">Error generating week:</div>
              <div>{generationError}</div>
              {weekStatus && (
                <div className="mt-2 text-sm">
                  Current status: {weekStatus.completed_workouts} completed,{' '}
                  {weekStatus.skipped_workouts || 0} skipped,{' '}
                  {weekStatus.total_workouts} total
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert className="mb-6 border-green-500/50 bg-green-500/5">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Week generation progress */}
        {generatingWeek && generationJob && (
          <Alert className="mb-6 border-primary/50 bg-primary/5">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  Generating Week {generationJob.week_number} workouts...
                </span>
              </div>
              {generationJob.current_step && (
                <span className="text-sm text-muted-foreground">
                  {generationJob.current_step}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                This may take 30-60 seconds. You can navigate away and return later.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Week completion banner with generate next week button */}
        {weekStatus &&
          !generatingWeek &&
          recommendation &&
          (recommendation.current_week || 1) < 6 && (
            <Alert
              className={`mb-6 ${
                weekStatus.is_complete
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-yellow-500/50 bg-yellow-500/5'
              }`}
            >
              <AlertDescription className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${
                      weekStatus.is_complete
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-yellow-700 dark:text-yellow-400'
                    }`}
                  >
                    {weekStatus.is_complete
                      ? `Week ${currentWeek} complete! Ready to generate Week ${
                          (recommendation.current_week || 1) + 1
                        }.`
                      : `Week ${currentWeek} progress: ${weekStatus.completed_workouts} of ${weekStatus.total_workouts} workouts completed (${weekStatus.skipped_workouts || 0} skipped). Complete all workouts (or skip them) to generate the next week.`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadWorkouts}
                    disabled={loading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  {weekStatus.is_complete && (
                    <Button
                      size="sm"
                      onClick={handleGenerateNextWeek}
                      disabled={generatingWeek}
                    >
                      {generatingWeek ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Week {(recommendation.current_week || 1) + 1}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upcoming">
                Upcoming ({scheduledWorkouts.length})
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress ({inProgressWorkouts.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedWorkouts.length})
              </TabsTrigger>
              <TabsTrigger value="skipped">
                Skipped ({skippedWorkouts.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="space-y-4 mt-4">
              {scheduledWorkouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No upcoming workouts
                </p>
              ) : (
                scheduledWorkouts.map((workout) => (
                  <WorkoutCard key={workout.id} workout={workout} />
                ))
              )}
            </TabsContent>
            <TabsContent value="in-progress" className="space-y-4 mt-4">
              {inProgressWorkouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No workouts in progress
                </p>
              ) : (
                inProgressWorkouts.map((workout) => (
                  <WorkoutCard key={workout.id} workout={workout} />
                ))
              )}
            </TabsContent>
            <TabsContent value="completed" className="space-y-4 mt-4">
              {completedWorkouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No completed workouts yet
                </p>
              ) : (
                completedWorkouts.map((workout) => (
                  <WorkoutCard key={workout.id} workout={workout} />
                ))
              )}
            </TabsContent>
            <TabsContent value="skipped" className="space-y-4 mt-4">
              {skippedWorkouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No skipped or cancelled workouts
                </p>
              ) : (
                skippedWorkouts.map((workout) => (
                  <WorkoutCard key={workout.id} workout={workout} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

