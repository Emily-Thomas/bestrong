'use client';

import { ArrowLeft, ChevronDown, ChevronUp, Edit, Loader2, Save } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type Recommendation,
  type Workout,
  recommendationsApi,
  type UpdateRecommendationInput,
} from '@/lib/api';

export default function RecommendationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);
  const recId = Number(params.recId);

  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null
  );
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateRecommendationInput>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadRecommendation = useCallback(async () => {
    const response = await recommendationsApi.getById(recId);
    if (response.success && response.data) {
      setRecommendation(response.data);
      // If workouts are included in the response, use them
      if (response.data.workouts) {
        setWorkouts(response.data.workouts);
      } else {
        // Otherwise, fetch them separately
        const workoutsResponse = await recommendationsApi.getWorkouts(recId);
        if (workoutsResponse.success && workoutsResponse.data) {
          setWorkouts(workoutsResponse.data);
        }
      }
      setFormData({
        sessions_per_week: response.data.sessions_per_week,
        session_length_minutes: response.data.session_length_minutes,
        training_style: response.data.training_style,
        status: response.data.status,
      });
    }
    setLoading(false);
  }, [recId]);

  useEffect(() => {
    loadRecommendation();
  }, [loadRecommendation]);

  const handleSave = async () => {
    setError('');
    setSaving(true);

    const response = await recommendationsApi.update(recId, formData);
    if (response.success && response.data) {
      setRecommendation(response.data);
      setEditing(false);
    } else {
      setError(response.error || 'Failed to update recommendation');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Recommendation" description="Loading details">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!recommendation) {
    return (
      <ProtectedRoute>
        <AppShell title="Recommendation" description="Not found">
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              Recommendation not found
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell
        title={recommendation.client_type}
        description="AI-generated training plan recommendation"
        action={
          !editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )
        }
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/clients/${clientId}`)}
          className="mb-4 w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Client
        </Button>

        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{recommendation.status}</Badge>
              {recommendation.is_edited && (
                <Badge variant="outline" className="gap-1">
                  <Edit className="h-3 w-3" />
                  Edited
                </Badge>
              )}
            </div>
            <CardTitle>Training Plan Details</CardTitle>
            <CardDescription>
              Review and customize the recommended training plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {editing ? (
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sessions_per_week">Sessions Per Week</Label>
                    <Input
                      id="sessions_per_week"
                      type="number"
                      min="1"
                      max="7"
                      value={formData.sessions_per_week}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sessions_per_week: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session_length_minutes">
                      Session Length (minutes)
                    </Label>
                    <Input
                      id="session_length_minutes"
                      type="number"
                      min="15"
                      max="120"
                      step="15"
                      value={formData.session_length_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          session_length_minutes: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="training_style">Training Style</Label>
                  <Input
                    id="training_style"
                    value={formData.training_style}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        training_style: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        status: value as Recommendation['status'],
                      })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      loadRecommendation();
                    }}
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
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Card className="bg-muted/50">
                    <CardContent className="p-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          Sessions Per Week
                        </p>
                        <p className="text-3xl font-bold text-primary">
                          {recommendation.sessions_per_week}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          Session Length
                        </p>
                        <p className="text-3xl font-bold text-primary">
                          {recommendation.session_length_minutes} min
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label>Training Style</Label>
                  <p className="text-lg">{recommendation.training_style}</p>
                </div>

                {recommendation.ai_reasoning && (
                  <div className="space-y-2">
                    <Label>AI Reasoning</Label>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">
                          {recommendation.ai_reasoning}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {recommendation.plan_structure && (
                  <div className="space-y-2">
                    <Label>6-Week Plan Structure</Label>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono overflow-x-auto">
                          {JSON.stringify(
                            recommendation.plan_structure,
                            null,
                            2
                          )}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div>
                    <Badge
                      variant={
                        recommendation.status === 'active'
                          ? 'default'
                          : recommendation.status === 'approved'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {recommendation.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workouts Section */}
        {workouts.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>6-Week Workout Program</CardTitle>
              <CardDescription>
                Complete workout plan with exercises, sets, reps, and guidance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkoutsDisplay workouts={workouts} />
            </CardContent>
          </Card>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

// Component to display workouts organized by week
function WorkoutsDisplay({ workouts }: { workouts: Workout[] }) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  // Group workouts by week
  const workoutsByWeek = workouts.reduce((acc, workout) => {
    if (!acc[workout.week_number]) {
      acc[workout.week_number] = [];
    }
    acc[workout.week_number].push(workout);
    return acc;
  }, {} as Record<number, Workout[]>);

  // Sort weeks
  const weeks = Object.keys(workoutsByWeek)
    .map(Number)
    .sort((a, b) => a - b);

  const toggleWeek = (week: number) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(week)) {
      newExpanded.delete(week);
    } else {
      newExpanded.add(week);
    }
    setExpandedWeeks(newExpanded);
  };

  return (
    <div className="space-y-4">
      {weeks.map((week) => {
        const weekWorkouts = workoutsByWeek[week].sort(
          (a, b) => a.session_number - b.session_number
        );
        const isExpanded = expandedWeeks.has(week);

        return (
          <Collapsible
            key={week}
            open={isExpanded}
            onOpenChange={() => toggleWeek(week)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Week {week}</span>
                  <Badge variant="secondary">
                    {weekWorkouts.length} session
                    {weekWorkouts.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-4 pl-4 border-l-2 border-muted">
                {weekWorkouts.map((workout) => (
                  <WorkoutCard key={workout.id} workout={workout} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

// Component to display a single workout
function WorkoutCard({ workout }: { workout: Workout }) {
  const [expanded, setExpanded] = useState(false);
  const { workout_data, workout_name, workout_reasoning } = workout;

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">
              Session {workout.session_number}
              {workout_name && `: ${workout_name}`}
            </CardTitle>
            {workout_data.total_duration_minutes && (
              <CardDescription>
                {workout_data.total_duration_minutes} minutes
                {workout_data.focus_areas &&
                  workout_data.focus_areas.length > 0 && (
                    <>
                      {' • '}
                      {workout_data.focus_areas.join(', ')}
                    </>
                  )}
              </CardDescription>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          {workout_reasoning && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <strong>Rationale:</strong> {workout_reasoning}
            </div>
          )}

          {workout_data.warmup && workout_data.warmup.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-sm">Warmup</h4>
              <ExerciseList exercises={workout_data.warmup} />
            </div>
          )}

          <div>
            <h4 className="font-semibold mb-2 text-sm">Main Exercises</h4>
            <ExerciseList exercises={workout_data.exercises} />
          </div>

          {workout_data.cooldown && workout_data.cooldown.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-sm">Cooldown</h4>
              <ExerciseList exercises={workout_data.cooldown} />
            </div>
          )}

          {workout_data.notes && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <strong>Notes:</strong> {workout_data.notes}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Component to display a list of exercises
function ExerciseList({ exercises }: { exercises: Array<{ name: string; sets?: number; reps?: string | number; weight?: string; rest_seconds?: number; notes?: string; tempo?: string; rir?: number }> }) {
  return (
    <div className="space-y-2">
      {exercises.map((exercise, idx) => (
        <div
          key={idx}
          className="flex items-start gap-3 p-3 bg-background rounded-md border"
        >
          <div className="flex-1">
            <div className="font-medium">{exercise.name}</div>
            <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
              {exercise.sets && (
                <span>
                  <strong>Sets:</strong> {exercise.sets}
                </span>
              )}
              {exercise.reps && (
                <span>
                  <strong>Reps:</strong> {exercise.reps}
                </span>
              )}
              {exercise.weight && (
                <span>
                  <strong>Load:</strong> {exercise.weight}
                </span>
              )}
              {exercise.rest_seconds && (
                <span>
                  <strong>Rest:</strong> {exercise.rest_seconds}s
                </span>
              )}
              {exercise.tempo && (
                <span>
                  <strong>Tempo:</strong> {exercise.tempo}
                </span>
              )}
              {exercise.rir !== undefined && (
                <span>
                  <strong>RIR:</strong> {exercise.rir}
                </span>
              )}
            </div>
            {exercise.notes && (
              <div className="mt-1 text-xs text-muted-foreground italic">
                {exercise.notes}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
