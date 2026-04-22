'use client';

import { LayoutGrid, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  inbodyScansApi,
  type LLMWorkoutPreview,
  type Recommendation,
  recommendationsApi,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { getPlanLibraryMeta } from './recommendation-plan-meta';

/** Shorter than TrainingPlansSection – job may still need polling if a worker lags. */
const POLL_MS = 3000;

interface GenerateWorkoutsPanelProps {
  clientId: number;
  recommendation: Recommendation;
  className?: string;
  onSaved?: () => void | Promise<void>;
}

export function GenerateWorkoutsPanel({
  clientId,
  recommendation,
  className,
  onSaved,
}: GenerateWorkoutsPanelProps) {
  const [checkingScan, setCheckingScan] = useState(true);
  const [hasVerifiedScan, setHasVerifiedScan] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await inbodyScansApi.hasScan(clientId);
        if (!cancelled && res.success && res.data) {
          setHasVerifiedScan(res.data.has_verified_scan === true);
        }
      } finally {
        if (!cancelled) setCheckingScan(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [step, setStep] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewJobId, setPreviewJobId] = useState<number | null>(null);
  const [previewWorkouts, setPreviewWorkouts] = useState<LLMWorkoutPreview[]>(
    []
  );
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [saving, setSaving] = useState(false);
  const [workoutCount, setWorkoutCount] = useState<number | null>(null);

  const planLib = getPlanLibraryMeta(recommendation);

  const refreshWorkoutCount = useCallback(async () => {
    const res = await recommendationsApi.getWorkouts(recommendation.id);
    if (res.success && res.data) {
      setWorkoutCount(res.data.length);
    } else {
      setWorkoutCount(0);
    }
  }, [recommendation.id]);

  useEffect(() => {
    void refreshWorkoutCount();
  }, [refreshWorkoutCount]);

  const pollJob = useCallback(
    async (id: number) => {
      const res = await recommendationsApi.getJobStatus(id);
      if (!res.success || !res.data) {
        setError(res.error || 'Could not load job status');
        setGenerating(false);
        setJobId(null);
        return;
      }
      const job = res.data;
      if (job.current_step) setStep(job.current_step);

      if (job.status === 'completed' && job.recommendation_id) {
        const pw = job.metadata?.preview_workouts;
        if (Array.isArray(pw) && pw.length > 0) {
          setPreviewWorkouts(pw);
          setJsonDraft(JSON.stringify(pw, null, 2));
          setPreviewJobId(id);
          setPreviewOpen(true);
        } else {
          setError('Generation finished but no preview was returned.');
        }
        setGenerating(false);
        setJobId(null);
        setStep('');
        return;
      }
      if (job.status === 'failed') {
        setError(job.error_message || 'Workout generation failed');
        setGenerating(false);
        setJobId(null);
        setStep('');
        return;
      }
      if (job.status === 'cancelled') {
        setGenerating(false);
        setJobId(null);
        setStep('');
        return;
      }
      if (job.status === 'pending' || job.status === 'processing') {
        setTimeout(() => void pollJob(id), POLL_MS);
      }
    },
    []
  );

  useEffect(() => {
    if (jobId != null && generating) {
      const t = setTimeout(() => void pollJob(jobId), 1500);
      return () => clearTimeout(t);
    }
  }, [jobId, generating, pollJob]);

  const handleStart = async () => {
    setError('');
    if (!hasVerifiedScan) {
      setError('Verify an InBody scan before generating workouts.');
      return;
    }
    setGenerating(true);
    setStep('Starting…');
    const res = await recommendationsApi.startWorkoutGenerationFromPlan(
      recommendation.id
    );
    const newJobId = res.success ? res.data?.job_id : undefined;
    if (newJobId != null) {
      setJobId(newJobId);
      setStep('Generating…');
    } else {
      setError(res.error || 'Could not start workout generation');
      setGenerating(false);
      setStep('');
    }
  };

  const handleSavePreview = async () => {
    setJsonError('');
    if (previewJobId == null) return;
    let workouts: LLMWorkoutPreview[] | undefined;
    try {
      const parsed = JSON.parse(jsonDraft) as unknown;
      if (!Array.isArray(parsed)) {
        setJsonError('JSON must be an array of workouts.');
        return;
      }
      workouts = parsed as LLMWorkoutPreview[];
    } catch {
      setJsonError('Invalid JSON. Fix the text or paste a valid array.');
      return;
    }

    setSaving(true);
    try {
      const res = await recommendationsApi.applyWorkoutGenerationPreview(
        recommendation.id,
        { job_id: previewJobId, workouts }
      );
      if (res.success) {
        setPreviewOpen(false);
        setPreviewJobId(null);
        setPreviewWorkouts([]);
        await refreshWorkoutCount();
        await onSaved?.();
      } else {
        setJsonError(res.error || 'Could not save workouts');
      }
    } catch {
      setJsonError('Could not save workouts');
    } finally {
      setSaving(false);
    }
  };

  const exerciseCount = (w: LLMWorkoutPreview) =>
    w.workout_data?.exercises?.length ?? 0;

  const hasSessions = workoutCount != null && workoutCount > 0;
  const reviewHref = `/clients/${clientId}/recommendations/${recommendation.id}/workouts-review`;

  return (
    <>
      <div
        className={cn(
          'rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.06] to-muted/20 p-4 shadow-sm dark:from-violet-500/10',
          className
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">
              {hasSessions
                ? planLib.libraryBuiltWorkouts
                  ? 'Sessions from your library plan'
                  : 'Mesocycle sessions'
                : 'Generate workouts from this plan'}
            </h4>
            {workoutCount === null ? (
              <p className="text-xs text-muted-foreground">Loading sessions…</p>
            ) : hasSessions ? (
              <p className="text-xs leading-relaxed text-muted-foreground max-w-xl">
                {planLib.libraryBuiltWorkouts ? (
                  <>
                    This mesocycle already has workouts from the template
                    (including load refinement). Use{' '}
                    <span className="font-medium text-foreground">
                      Review mesocycle
                    </span>{' '}
                    to swap exercises and tune sessions. Running AI again replaces
                    all sessions — only use that if you want a full redo.
                  </>
                ) : (
                  <>
                    You have saved sessions for this plan. Open{' '}
                    <span className="font-medium text-foreground">
                      Review mesocycle
                    </span>{' '}
                    to adjust exercises, or run AI below to draft a replacement
                    set of workouts (then save from the preview).
                  </>
                )}
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground max-w-xl">
                For AI- or manual-only mesocycles (no library blueprint
                sessions), run AI here to draft every week and session. You
                review the preview, save to the client, then use{' '}
                <span className="font-medium text-foreground">
                  Review mesocycle
                </span>{' '}
                for exercise swaps and polish.
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {hasSessions ? (
              <Button size="sm" variant="default" asChild>
                <Link href={reviewHref}>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Review mesocycle
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant={hasSessions ? 'outline' : 'default'}
              disabled={
                generating ||
                checkingScan ||
                !hasVerifiedScan ||
                recommendation.trainer_id == null
              }
              onClick={() => void handleStart()}
              className={cn(hasSessions && 'border-dashed')}
              title={
                recommendation.trainer_id == null
                  ? 'Link a coach to this plan first (Coach & plan)'
                  : hasSessions
                    ? 'Replaces all existing sessions after you save the preview'
                    : undefined
              }
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Working…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {hasSessions
                    ? 'Regenerate with AI (full redo)'
                    : 'Generate workouts'}
                </>
              )}
            </Button>
          </div>
        </div>
        {recommendation.trainer_id == null && (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
            Assign a coach to the plan before generating workouts (coach persona
            + exercise library).
          </p>
        )}
        {generating && (
          <Alert className="mt-3 border-violet-500/30 bg-violet-500/[0.04]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="text-sm">
              {step || 'Generating mesocycle workouts…'} This can take several
              minutes. You can leave this page and come back.
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Review generated workouts</DialogTitle>
            <DialogDescription>
              {previewWorkouts.length} session
              {previewWorkouts.length === 1 ? '' : 's'} — adjust the JSON if
              needed, then save. Nothing is stored until you click Save. After
              saving, use Review mesocycle for exercise swaps and coaching
              tweaks.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[40vh] border-y px-6">
            <ul className="py-3 space-y-2 text-sm">
              {previewWorkouts.map((w) => (
                <li
                  key={`${w.week_number}-${w.session_number}-${w.workout_name}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <span className="font-medium text-foreground">
                    W{w.week_number} · S{w.session_number}: {w.workout_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {exerciseCount(w)} exercises
                  </span>
                </li>
              ))}
            </ul>
          </ScrollArea>
          <div className="p-6 pt-2 space-y-2 flex-1 min-h-0 flex flex-col">
            <Label htmlFor="workout-json">Workout data (JSON)</Label>
            <Textarea
              id="workout-json"
              value={jsonDraft}
              onChange={(e) => setJsonDraft(e.target.value)}
              className="font-mono text-xs min-h-[180px] flex-1"
              spellCheck={false}
            />
            {jsonError && (
              <p className="text-sm text-destructive">{jsonError}</p>
            )}
          </div>
          <DialogFooter className="p-6 pt-0 gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPreviewOpen(false);
                setPreviewJobId(null);
              }}
            >
              Discard
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void handleSavePreview()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save workouts to client'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
