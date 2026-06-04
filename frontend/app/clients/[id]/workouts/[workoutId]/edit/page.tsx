'use client';

import {
  ArrowLeft,
  BookOpen,
  Library,
  Loader2,
  PenLine,
  Save,
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { importedProgramFromSearchParams } from '@/lib/client-onboarding';
import { cn } from '@/lib/utils';
import {
  type Exercise,
  type ExerciseLibraryExercise,
  type Workout,
  type WorkoutData,
  workoutsApi,
} from '@/lib/api';
import { CoachNotesCollapsible } from './components/CoachNotesCollapsible';
import { ExerciseLibraryPicker } from './components/ExerciseLibraryPicker';
import { ExerciseGroupBlock } from './components/ExerciseGroupBlock';
import { LinkSelectionToolbar } from './components/LinkSelectionToolbar';
import { SegmentPairLinkButton } from './components/SegmentPairLinkButton';
import { StandaloneExerciseBlock } from './components/StandaloneExerciseBlock';
import { WorkoutEditStickyFooter } from './components/WorkoutEditStickyFooter';
import { touchActionClass } from '@/lib/touch-targets';
import {
  EDIT_EXERCISES_LIST,
  EXERCISES_SECTION_HELPER,
  EDIT_PAGE_CONTAINER,
  EDIT_PAGE_INNER,
  EDIT_PANEL_BODY,
  EDIT_PANEL_CLASS,
  EDIT_PANEL_HEADER,
} from './lib/edit-ui-classes';
import { exerciseFromLibrary } from './lib/exercise-from-library';
import { mergeExerciseUpdates } from './lib/merge-exercise-updates';
import {
  dissolveExerciseGroup,
  linkExercisesAtIndices,
  normalizeWorkoutExercises,
  segmentExercises,
  unlinkExerciseFromGroup,
  validateExerciseGroups,
} from '@/lib/exercise-groups';

type PickerTarget =
  | { type: 'new' }
  | { type: 'replace'; index: number }
  | { type: 'add_to_group'; groupId: string; insertAfterIndex: number };

const DEFAULT_FOOTER_PADDING = 112;

export default function EditWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = Number(params.id);
  const workoutId = Number(params.workoutId);

  const isImportedProgram = importedProgramFromSearchParams(searchParams);

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutReasoning, setWorkoutReasoning] = useState('');
  const [editRevision, setEditRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const [footerPadding, setFooterPadding] = useState(DEFAULT_FOOTER_PADDING);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const pickerTargetRef = useRef<PickerTarget | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [linkSelection, setLinkSelection] = useState<number[]>([]);

  const bumpEdit = useCallback(() => {
    setEditRevision((r) => r + 1);
  }, []);

  const resetEditBaseline = useCallback(() => {
    setEditRevision(0);
    setSavedRevision(0);
  }, []);

  const clientBackHref = useMemo(() => {
    const q = new URLSearchParams();
    const tab = searchParams.get('tab');
    if (tab) q.set('tab', tab);
    if (isImportedProgram) q.set('imported', '1');
    const qs = q.toString();
    return qs ? `/clients/${clientId}?${qs}` : `/clients/${clientId}`;
  }, [clientId, isImportedProgram, searchParams]);

  const backLabel = isImportedProgram
    ? 'Back to program builder'
    : 'Back to client';

  const isDirty = editRevision !== savedRevision;

  const handleFooterHeight = useCallback((heightPx: number) => {
    setFooterPadding(heightPx + 16);
  }, []);

  const loadWorkout = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await workoutsApi.getById(workoutId);
      if (response.success && response.data) {
        const w = response.data;
        setWorkout(w);
        setWorkoutData({
          ...w.workout_data,
          exercises: normalizeWorkoutExercises(w.workout_data.exercises ?? []),
        });
        setWorkoutName(w.workout_name || '');
        setWorkoutReasoning(w.workout_reasoning || '');
        resetEditBaseline();
      } else {
        setError(response.error || 'Failed to load workout');
      }
    } catch (_err) {
      setError('Failed to load workout');
    } finally {
      setLoading(false);
    }
  }, [workoutId, resetEditBaseline]);

  useEffect(() => {
    if (workoutId) {
      void loadWorkout();
    }
  }, [workoutId, loadWorkout]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const requestLeave = useCallback(
    (href: string) => {
      if (isDirty) {
        setPendingLeaveHref(href);
        setLeaveDialogOpen(true);
      } else {
        router.push(href);
      }
    },
    [isDirty, router]
  );

  const confirmLeave = () => {
    if (pendingLeaveHref) router.push(pendingLeaveHref);
    setLeaveDialogOpen(false);
    setPendingLeaveHref(null);
  };

  const updateExerciseAtIndex = useCallback(
    (index: number, updates: Partial<Exercise>) => {
      setWorkoutData((prev) => {
        if (!prev) return prev;
        const newExercises = [...prev.exercises];
        newExercises[index] = mergeExerciseUpdates(newExercises[index], updates);
        return { ...prev, exercises: newExercises };
      });
      bumpEdit();
    },
    [bumpEdit]
  );

  const openLibraryPicker = useCallback((target: PickerTarget) => {
    pickerTargetRef.current = target;
    setLibraryPickerOpen(true);
  }, []);

  const handleLibrarySelect = useCallback(
    (lib: ExerciseLibraryExercise) => {
      const target = pickerTargetRef.current;
      if (!target) return;

      setWorkoutData((prev) => {
        if (!prev) return prev;
        if (target.type === 'new') {
          return {
            ...prev,
            exercises: [...prev.exercises, exerciseFromLibrary(lib)],
          };
        }
        if (target.type === 'add_to_group') {
          const newExercises = [...prev.exercises];
          const inserted = {
            ...exerciseFromLibrary(lib),
            group_id: target.groupId,
          };
          newExercises.splice(target.insertAfterIndex + 1, 0, inserted);
          return {
            ...prev,
            exercises: normalizeWorkoutExercises(newExercises),
          };
        }
        const newExercises = [...prev.exercises];
        const prior = newExercises[target.index];
        newExercises[target.index] = exerciseFromLibrary(lib, prior ?? {});
        return { ...prev, exercises: newExercises };
      });
      pickerTargetRef.current = null;
      bumpEdit();
    },
    [bumpEdit]
  );

  const addCustomExercise = useCallback(() => {
    setWorkoutData((prev) => {
      if (!prev) return prev;
      const newExercise: Exercise = {
        name: '',
        is_custom: true,
      };
      return {
        ...prev,
        exercises: [...prev.exercises, newExercise],
      };
    });
    bumpEdit();
  }, [bumpEdit]);

  const replaceExerciseAtIndex = useCallback(
    (index: number) => {
      openLibraryPicker({ type: 'replace', index });
    },
    [openLibraryPicker]
  );

  const requestRemoveAtIndex = useCallback((index: number) => {
    setRemoveIndex(index);
  }, []);

  const confirmRemoveExercise = () => {
    if (removeIndex === null) return;
    setWorkoutData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: normalizeWorkoutExercises(
          prev.exercises.filter((_, i) => i !== removeIndex)
        ),
      };
    });
    const removedAt = removeIndex;
    setRemoveIndex(null);
    setLinkSelection((prev) =>
      prev
        .filter((i) => i !== removedAt)
        .map((i) => (i > removedAt ? i - 1 : i))
    );
    bumpEdit();
  };

  const applySessionExercises = useCallback(
    (exercises: Exercise[]) => {
      setWorkoutData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: normalizeWorkoutExercises(exercises),
        };
      });
      bumpEdit();
    },
    [bumpEdit]
  );

  const toggleLinkSelect = useCallback((index: number) => {
    setLinkSelection((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      return [...prev, index].sort((a, b) => a - b);
    });
  }, []);

  const linkSelectedMovements = useCallback(() => {
    if (!workoutData || linkSelection.length < 2) return;
    applySessionExercises(
      linkExercisesAtIndices(workoutData.exercises, linkSelection)
    );
    setLinkSelection([]);
  }, [workoutData, linkSelection, applySessionExercises]);

  const linkAdjacentPair = useCallback(
    (topIndex: number, bottomIndex: number) => {
      if (!workoutData) return;
      applySessionExercises(
        linkExercisesAtIndices(workoutData.exercises, [topIndex, bottomIndex])
      );
    },
    [workoutData, applySessionExercises]
  );

  const openAddToGroupPicker = useCallback(
    (groupId: string) => {
      if (!workoutData) return;
      let insertAfterIndex = -1;
      workoutData.exercises.forEach((ex, i) => {
        if (ex.group_id === groupId) insertAfterIndex = i;
      });
      if (insertAfterIndex < 0) return;
      pickerTargetRef.current = {
        type: 'add_to_group',
        groupId,
        insertAfterIndex,
      };
      setLibraryPickerOpen(true);
    },
    [workoutData]
  );

  const unlinkAtIndex = useCallback(
    (index: number) => {
      setWorkoutData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: unlinkExerciseFromGroup(prev.exercises, index),
        };
      });
      bumpEdit();
    },
    [bumpEdit]
  );

  const dissolveGroup = useCallback(
    (groupId: string) => {
      setWorkoutData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: dissolveExerciseGroup(prev.exercises, groupId),
        };
      });
      bumpEdit();
    },
    [bumpEdit]
  );

  const exerciseSegments = useMemo(
    () =>
      workoutData ? segmentExercises(workoutData.exercises) : [],
    [workoutData]
  );

  const handleSave = useCallback(async () => {
    if (!workout || !workoutData) return;

    const unnamed = workoutData.exercises.some((ex) => !ex.name?.trim());
    if (unnamed) {
      setError(
        'Every movement needs a name. Pick from the library or enter a custom name.'
      );
      return;
    }

    const groupError = validateExerciseGroups(workoutData.exercises);
    if (groupError) {
      setError(groupError);
      return;
    }

    const normalizedData = {
      ...workoutData,
      exercises: normalizeWorkoutExercises(workoutData.exercises),
    };

    setSaving(true);
    setError('');

    try {
      const response = await workoutsApi.update(workout.id, {
        workout_name: workoutName || undefined,
        workout_data: normalizedData,
        workout_reasoning: workoutReasoning || undefined,
      });
      if (response.success) {
        setSavedRevision(editRevision);
        router.push(clientBackHref);
      } else {
        setError(
          response.error ||
            'Something went wrong saving this session. Try again.'
        );
      }
    } catch (_err) {
      setError('Something went wrong saving this session. Try again.');
    } finally {
      setSaving(false);
    }
  }, [
    workout,
    workoutData,
    workoutName,
    workoutReasoning,
    editRevision,
    clientBackHref,
    router,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 's') return;
      e.preventDefault();
      if (!saving && workout && workoutData) void handleSave();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave, saving, workout, workoutData]);

  const pageDescription = isImportedProgram
    ? 'Add movements and sets for this session in your program.'
    : 'Add movements from your exercise library, then set sets and load';

  const sessionTitle =
    workoutName ||
    (workout
      ? `Week ${workout.week_number}, Session ${workout.session_number}`
      : 'Edit workout');

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Edit workout" description="Loading session">
          <div className={EDIT_PAGE_CONTAINER}>
            <output
              className={cn(EDIT_PANEL_CLASS, 'block w-full')}
              aria-live="polite"
            >
              <div className="flex flex-col items-center justify-center px-6 py-16">
                <Loader2
                  className="mb-3 h-8 w-8 animate-spin text-primary"
                  aria-hidden
                />
                <p className="text-sm text-muted-foreground">
                  Scout is loading this session…
                </p>
              </div>
            </output>
          </div>
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
          <div
            className={cn(EDIT_PANEL_CLASS, EDIT_PANEL_BODY, 'max-w-md text-center')}
          >
            <p className="text-sm text-pretty text-muted-foreground">
              We couldn&apos;t find that session. It may have been removed.
            </p>
            <Button
              variant="outline"
              className={cn('mt-4', touchActionClass)}
              type="button"
              onClick={() => router.push(clientBackHref)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              {backLabel}
            </Button>
          </div>
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
          <div
            className={cn(EDIT_PANEL_CLASS, EDIT_PANEL_BODY, 'max-w-md text-center')}
          >
            <p className="mb-4 text-muted-foreground">
              This workout is completed, so the plan can&apos;t be changed here.
              View the session to see what was logged.
            </p>
            <Button
              variant="outline"
              className={touchActionClass}
              onClick={() =>
                router.push(`/clients/${clientId}/workouts/${workoutId}`)
              }
            >
              View workout
            </Button>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell
        title={`Edit: ${sessionTitle}`}
        description={pageDescription}
        backAction={
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className={touchActionClass}
            onClick={() => requestLeave(clientBackHref)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            {backLabel}
          </Button>
        }
      >
        <div
          className={EDIT_PAGE_CONTAINER}
          style={{ paddingBottom: footerPadding }}
        >
          {error ? (
            <Alert
              variant="destructive"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <section className={EDIT_PANEL_CLASS} aria-labelledby="session-details-heading">
            <div className={EDIT_PANEL_HEADER}>
              <h2
                id="session-details-heading"
                className="text-sm font-semibold text-foreground"
              >
                Session details
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Week {workout.week_number} · Session {workout.session_number}
              </p>
            </div>
            <div className={cn(EDIT_PANEL_BODY, 'space-y-4')}>
              <div className="space-y-2">
                <Label htmlFor="workout-name">Session name</Label>
                <Input
                  id="workout-name"
                  value={workoutName}
                  onChange={(e) => {
                    setWorkoutName(e.target.value);
                    bumpEdit();
                  }}
                  placeholder="e.g., Upper body strength"
                />
              </div>

              {isImportedProgram ? (
                <CoachNotesCollapsible
                  value={workoutReasoning}
                  onChange={(value) => {
                    setWorkoutReasoning(value);
                    bumpEdit();
                  }}
                />
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="workout-reasoning">Workout reasoning</Label>
                  <Textarea
                    id="workout-reasoning"
                    value={workoutReasoning}
                    onChange={(e) => {
                      setWorkoutReasoning(e.target.value);
                      bumpEdit();
                    }}
                    placeholder="Why this workout was designed..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </section>

          <section className={EDIT_PANEL_CLASS} aria-labelledby="exercises-heading">
            <div className={EDIT_PANEL_HEADER}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <h2
                    id="exercises-heading"
                    className="text-sm font-semibold text-foreground"
                  >
                    Exercises
                  </h2>
                  <p className="text-xs text-pretty text-muted-foreground">
                    {EXERCISES_SECTION_HELPER}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    size="sm"
                    className={cn('gap-2', touchActionClass)}
                    type="button"
                    onClick={() => openLibraryPicker({ type: 'new' })}
                  >
                    <BookOpen className="h-4 w-4" aria-hidden />
                    Add from library
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    className={cn('gap-2', touchActionClass)}
                    onClick={addCustomExercise}
                  >
                    <PenLine className="h-4 w-4" aria-hidden />
                    Add custom
                  </Button>
                </div>
              </div>
            </div>

            {workoutData.exercises.length === 0 ? (
              <div className={cn(EDIT_PANEL_BODY, 'text-center')}>
                <Library
                  className="mx-auto h-8 w-8 text-muted-foreground/60"
                  aria-hidden
                />
                <p className="mt-3 text-sm font-medium text-foreground">
                  Ready to add movements?
                </p>
                <p className="mt-1 text-xs text-pretty text-muted-foreground">
                  Start from your library. Add a custom movement only when it is
                  not in your roster.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className={cn('mt-4 gap-2', touchActionClass)}
                  onClick={() => openLibraryPicker({ type: 'new' })}
                >
                  <BookOpen className="h-4 w-4" aria-hidden />
                  Browse exercise library
                </Button>
              </div>
            ) : (
              <>
                <LinkSelectionToolbar
                  selectedIndices={linkSelection}
                  onLinkSelected={linkSelectedMovements}
                  onClear={() => setLinkSelection([])}
                />
                <ul
                  className={EDIT_EXERCISES_LIST}
                  aria-label="Exercises in this session"
                >
                  {exerciseSegments.flatMap((segment, segmentIndex) => {
                    const sessionExercises = workoutData.exercises;
                    const elements: React.ReactNode[] = [];

                    if (segment.kind === 'group') {
                      elements.push(
                        <ExerciseGroupBlock
                          key={segment.groupId}
                          segment={segment}
                          segmentIndex={segmentIndex}
                          compactPrescription={isImportedProgram}
                          sessionExercises={sessionExercises}
                          onSessionExercisesChange={applySessionExercises}
                          onUpdateAtIndex={updateExerciseAtIndex}
                          onReplaceAtIndex={replaceExerciseAtIndex}
                          onRemoveAtIndex={requestRemoveAtIndex}
                          onUnlinkAtIndex={unlinkAtIndex}
                          onDissolveGroup={dissolveGroup}
                          onAddMovementToGroup={openAddToGroupPicker}
                        />
                      );
                    } else {
                      const { exercise, index } = segment.items[0];
                      elements.push(
                        <StandaloneExerciseBlock
                          key={
                            exercise.exercise_instance_id ??
                            `standalone-${index}`
                          }
                          exercise={exercise}
                          index={index}
                          compactPrescription={isImportedProgram}
                          sessionExercises={sessionExercises}
                          onSessionExercisesChange={applySessionExercises}
                          selectedForLink={linkSelection.includes(index)}
                          onToggleSelectForLink={toggleLinkSelect}
                          onUpdateAtIndex={updateExerciseAtIndex}
                          onReplaceAtIndex={replaceExerciseAtIndex}
                          onRemoveAtIndex={requestRemoveAtIndex}
                        />
                      );
                    }

                    const nextSeg = exerciseSegments[segmentIndex + 1];
                    if (
                      segment.kind === 'standalone' &&
                      nextSeg?.kind === 'standalone'
                    ) {
                      const top = segment.items[0];
                      const bottom = nextSeg.items[0];
                      if (bottom.index === top.index + 1) {
                        elements.push(
                          <SegmentPairLinkButton
                            key={`pair-${top.index}-${bottom.index}`}
                            topName={top.exercise.name}
                            bottomName={bottom.exercise.name}
                            onLink={() =>
                              linkAdjacentPair(top.index, bottom.index)
                            }
                          />
                        );
                      }
                    }

                    return elements;
                  })}
                </ul>
              </>
            )}
          </section>
        </div>

        <WorkoutEditStickyFooter onHeightChange={handleFooterHeight}>
          <div
            className={cn(
              EDIT_PAGE_INNER,
              'flex flex-wrap items-center justify-between gap-3 py-3'
            )}
          >
            <div className="flex items-center gap-2 text-sm">
              {isDirty ? (
                <Badge variant="outline" className="font-normal">
                  Unsaved changes
                </Badge>
              ) : (
                <span className="text-muted-foreground">All changes saved</span>
              )}
              <span className="sr-only">
                Press Control+S or Command+S to save changes
              </span>
              <span className="hidden text-muted-foreground md:inline" aria-hidden>
                · Ctrl+S / ⌘S
              </span>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                className={cn('flex-1 sm:flex-none', touchActionClass)}
                type="button"
                onClick={() => requestLeave(clientBackHref)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className={cn('flex-1 sm:flex-none', touchActionClass)}
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                aria-busy={saving}
                aria-keyshortcuts="Control+s Meta+s"
              >
                {saving ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" aria-hidden />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </WorkoutEditStickyFooter>

        <ExerciseLibraryPicker
          open={libraryPickerOpen}
          onOpenChange={(open) => {
            setLibraryPickerOpen(open);
            if (!open) pickerTargetRef.current = null;
          }}
          onSelect={handleLibrarySelect}
        />

        <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes to this session. Save first or your
                edits will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingLeaveHref(null)}>
                Keep editing
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmLeave}
              >
                Leave without saving
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={removeIndex !== null}
          onOpenChange={(open) => {
            if (!open) setRemoveIndex(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this exercise?</AlertDialogTitle>
              <AlertDialogDescription>
                {removeIndex !== null &&
                workoutData.exercises[removeIndex]?.name?.trim()
                  ? `"${workoutData.exercises[removeIndex].name}" will be removed from this session.`
                  : 'This movement will be removed from the session.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRemoveExercise}>
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppShell>
    </ProtectedRoute>
  );
}
