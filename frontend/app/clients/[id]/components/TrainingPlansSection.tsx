'use client';

import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  Info,
  Layers,
  Loader2,
  Lock,
  PenLine,
  Sparkles,
  UserCircle2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type CoachFitAnalysis,
  getCoachFitAnalysisFromQuestionnaire,
  inbodyScansApi,
  type ManualPlanStartPayload,
  normalizeCoachFitAnalysis,
  type PlanTemplateGoalCategory,
  type PlanTemplateSummary,
  type Questionnaire,
  type Recommendation,
  recommendationsApi,
  type Trainer,
  trainersApi,
  type Workout,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { GenerateWorkoutsPanel } from './GenerateWorkoutsPanel';
import { ManualMesocycleForm } from './ManualMesocycleForm';
import { PlanTemplateDetailDialog } from './PlanTemplateDetailDialog';
import {
  getPlanLibraryMeta,
  getPlanOriginFromRecommendation,
} from './recommendation-plan-meta';

const GOAL_VISUAL: Record<
  PlanTemplateGoalCategory,
  {
    shortLabel: string;
    leftBar: string;
    cardTint: string;
    goalBadge: string;
  }
> = {
  general_fitness: {
    shortLabel: 'General fitness',
    leftBar: 'border-l-emerald-500',
    cardTint:
      'bg-gradient-to-br from-emerald-500/[0.09] via-background to-background dark:from-emerald-500/[0.12]',
    goalBadge:
      'bg-emerald-500/20 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-50',
  },
  fat_loss: {
    shortLabel: 'Fat loss',
    leftBar: 'border-l-orange-500',
    cardTint:
      'bg-gradient-to-br from-orange-500/[0.09] via-background to-background dark:from-orange-500/[0.12]',
    goalBadge:
      'bg-orange-500/20 text-orange-950 dark:bg-orange-500/25 dark:text-orange-50',
  },
  muscle_gain: {
    shortLabel: 'Muscle gain',
    leftBar: 'border-l-violet-500',
    cardTint:
      'bg-gradient-to-br from-violet-500/[0.09] via-background to-background dark:from-violet-500/[0.12]',
    goalBadge:
      'bg-violet-500/20 text-violet-950 dark:bg-violet-500/25 dark:text-violet-50',
  },
  strength: {
    shortLabel: 'Strength',
    leftBar: 'border-l-blue-600',
    cardTint:
      'bg-gradient-to-br from-blue-600/[0.09] via-background to-background dark:from-blue-600/[0.12]',
    goalBadge:
      'bg-blue-500/20 text-blue-950 dark:bg-blue-500/25 dark:text-blue-50',
  },
  athletic_performance: {
    shortLabel: 'Athletic',
    leftBar: 'border-l-amber-500',
    cardTint:
      'bg-gradient-to-br from-amber-500/[0.1] via-background to-background dark:from-amber-500/[0.14]',
    goalBadge:
      'bg-amber-500/20 text-amber-950 dark:bg-amber-500/25 dark:text-amber-50',
  },
  health_longevity: {
    shortLabel: 'Health',
    leftBar: 'border-l-teal-500',
    cardTint:
      'bg-gradient-to-br from-teal-500/[0.09] via-background to-background dark:from-teal-500/[0.12]',
    goalBadge:
      'bg-teal-500/20 text-teal-950 dark:bg-teal-500/25 dark:text-teal-50',
  },
  return_to_training: {
    shortLabel: 'Return',
    leftBar: 'border-l-cyan-500',
    cardTint:
      'bg-gradient-to-br from-cyan-500/[0.09] via-background to-background dark:from-cyan-500/[0.12]',
    goalBadge:
      'bg-cyan-500/20 text-cyan-950 dark:bg-cyan-500/25 dark:text-cyan-50',
  },
};

function LockedCoachPlanReadonly({
  clientId,
  recommendation,
  planOrigin,
  planLib,
  trainer,
}: {
  clientId: number;
  recommendation: Recommendation;
  planOrigin: ReturnType<typeof getPlanOriginFromRecommendation>;
  planLib: ReturnType<typeof getPlanLibraryMeta>;
  trainer: Trainer | null;
}) {
  return (
    <div className="space-y-4">
      <Alert className="border-muted-foreground/40 bg-muted/40">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <AlertDescription className="text-sm">
          <span className="font-medium text-foreground">
            Initial coach &amp; plan are locked
          </span>{' '}
          because this client has mesocycle sessions (created or started).
          Changing the plan or coach here will be supported once historic plans
          and plan versioning are available.
        </AlertDescription>
      </Alert>

      <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Coach on this plan
          </p>
          {trainer ? (
            <div className="mt-2 flex items-center gap-3">
              <Avatar className="h-11 w-11 border border-border/70">
                {trainer.image_url ? (
                  <AvatarImage
                    src={trainer.image_url}
                    alt=""
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
                  {`${trainer.first_name?.[0] ?? ''}${trainer.last_name?.[0] ?? ''}`}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">
                  {trainer.first_name} {trainer.last_name}
                </p>
                {trainer.title ? (
                  <p className="text-xs text-muted-foreground">{trainer.title}</p>
                ) : null}
              </div>
            </div>
          ) : recommendation.trainer_id == null ? (
            <p className="mt-1 text-sm text-muted-foreground">
              No coach linked on this plan.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Coach ID {recommendation.trainer_id} (not in your first three
              persona trainers on this screen).
            </p>
          )}
        </div>

        <div className="border-t border-border/60 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Plan source
          </p>
          <p className="mt-2 text-sm text-foreground">
            {planOrigin === 'library' && planLib.templateName ? (
              <>
                <span className="text-muted-foreground">Plan library: </span>
                <span className="font-semibold">{planLib.templateName}</span>
              </>
            ) : planOrigin === 'library' ? (
              <span>Plan library (older save without template name)</span>
            ) : planOrigin === 'ai' ? (
              <span>Generated with AI from questionnaire + InBody</span>
            ) : planOrigin === 'manual' ? (
              <span>Defined manually</span>
            ) : (
              <span className="text-muted-foreground">
                Saved mesocycle (source not recorded)
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {recommendation.client_type} · {recommendation.sessions_per_week}{' '}
            sessions/week · {recommendation.session_length_minutes} min/session
          </p>
          <Button variant="link" className="mt-2 h-auto p-0 text-sm" asChild>
            <Link
              href={`/clients/${clientId}/recommendations/${recommendation.id}`}
            >
              View full plan details
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

const EXPERIENCE_BADGE: Record<
  PlanTemplateSummary['experience_level'],
  { label: string; className: string }
> = {
  beginner: {
    label: 'Beginner',
    className: 'bg-sky-500/20 text-sky-950 dark:bg-sky-500/25 dark:text-sky-50',
  },
  intermediate: {
    label: 'Intermediate',
    className:
      'bg-amber-500/20 text-amber-950 dark:bg-amber-500/22 dark:text-amber-50',
  },
  advanced: {
    label: 'Advanced',
    className:
      'bg-fuchsia-500/20 text-fuchsia-950 dark:bg-fuchsia-500/22 dark:text-fuchsia-50',
  },
};

interface TrainingPlansSectionProps {
  clientId: number;
  questionnaire: Questionnaire | null;
  recommendation: Recommendation | null;
  onRecommendationUpdate: (recommendation: Recommendation | null) => void;
  /** Reload client/questionnaire after coach-fit is saved (so it survives refresh) */
  onRefresh?: () => void | Promise<void>;
  /** Softer frame when nested in setup workspace */
  embedded?: boolean;
}

export function TrainingPlansSection({
  clientId,
  questionnaire,
  recommendation,
  onRecommendationUpdate,
  onRefresh,
  embedded = false,
}: TrainingPlansSectionProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState('');
  const [hasAnyScan, setHasAnyScan] = useState<boolean | null>(null);
  const [hasVerifiedScan, setHasVerifiedScan] = useState<boolean | null>(null);
  const [checkingScan, setCheckingScan] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [genMode, setGenMode] = useState<'plan' | 'library' | 'manual' | null>(
    null
  );
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(false);
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(
    null
  );
  const [coachFit, setCoachFit] = useState<CoachFitAnalysis | null>(null);
  const [coachFitLoading, setCoachFitLoading] = useState(false);
  const [coachFitError, setCoachFitError] = useState('');

  const [planTemplates, setPlanTemplates] = useState<PlanTemplateSummary[]>([]);
  const [planTemplatesLoading, setPlanTemplatesLoading] = useState(false);
  const [planTemplatesError, setPlanTemplatesError] = useState('');
  const [goalFilter, setGoalFilter] = useState<
    'all' | PlanTemplateGoalCategory
  >('all');
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(
    null
  );
  const [detailTemplateId, setDetailTemplateId] = useState<string | null>(null);

  const [initialPlanMode, setInitialPlanMode] = useState<
    'library' | 'ai' | 'manual' | null
  >(null);

  const [workoutsForLock, setWorkoutsForLock] = useState<Workout[] | null>(
    null
  );

  const trainerReadyForComparison = (t: Trainer) =>
    Boolean(t.structured_persona?.ai_prompt_injection?.trim());

  const eligibleTrainers = trainers.filter(trainerReadyForComparison);

  const threeCoaches = useMemo(
    () => eligibleTrainers.slice(0, 3),
    [eligibleTrainers]
  );

  const lastQuestionnaireIdRef = useRef<number | null>(null);

  useEffect(() => {
    const raw = getCoachFitAnalysisFromQuestionnaire(questionnaire);
    const n = raw ? normalizeCoachFitAnalysis(raw) : null;
    setCoachFit(n);

    if (recommendation?.trainer_id != null) {
      setSelectedTrainerId(recommendation.trainer_id);
      lastQuestionnaireIdRef.current = questionnaire?.id ?? null;
      return;
    }

    const qid = questionnaire?.id ?? null;
    const qidChanged = lastQuestionnaireIdRef.current !== qid;
    lastQuestionnaireIdRef.current = qid;

    setSelectedTrainerId((prev) => {
      if (qidChanged) {
        return n?.recommended_trainer_id ?? null;
      }
      if (prev !== null) return prev;
      return n?.recommended_trainer_id ?? null;
    });
  }, [questionnaire, questionnaire?.id, recommendation?.trainer_id]);

  useEffect(() => {
    const loadTrainers = async () => {
      setTrainersLoading(true);
      const res = await trainersApi.getAll();
      if (res.success && res.data) {
        setTrainers(res.data);
      }
      setTrainersLoading(false);
    };
    void loadTrainers();
  }, []);

  useEffect(() => {
    if (!recommendation?.id) {
      setWorkoutsForLock(null);
      return;
    }
    let cancelled = false;
    setWorkoutsForLock(null);
    (async () => {
      const res = await recommendationsApi.getWorkouts(recommendation.id);
      if (!cancelled) {
        setWorkoutsForLock(res.success && res.data ? res.data : []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recommendation?.id]);

  const sessionsLoadingForLock =
    recommendation != null && workoutsForLock === null;

  const planSetupLocked = useMemo(() => {
    if (!recommendation || workoutsForLock === null) {
      return false;
    }
    if (workoutsForLock.length > 0) {
      return true;
    }
    return workoutsForLock.some((w) => {
      const s = w.status;
      if (s === 'in_progress' || s === 'completed' || s === 'skipped') {
        return true;
      }
      if (w.completed_at) {
        return true;
      }
      return false;
    });
  }, [recommendation, workoutsForLock]);

  const lockedTrainer = useMemo(() => {
    const id = recommendation?.trainer_id;
    if (id == null) {
      return null;
    }
    return trainers.find((t) => t.id === id) ?? null;
  }, [recommendation?.trainer_id, trainers]);

  const refreshWorkoutsForLock = useCallback(async () => {
    if (!recommendation?.id) {
      return;
    }
    const res = await recommendationsApi.getWorkouts(recommendation.id);
    if (res.success && res.data) {
      setWorkoutsForLock(res.data);
    }
  }, [recommendation?.id]);

  const pollJobStatus = useCallback(
    async (jobId: number) => {
      try {
        const statusResponse = await recommendationsApi.getJobStatus(jobId);

        if (!statusResponse.success || !statusResponse.data) {
          setError('Failed to check generation status');
          setGenerating(false);
          setGenMode(null);
          return;
        }

        const job = statusResponse.data;

        if (job.current_step) {
          setCurrentStep(job.current_step);
        }

        if (job.status === 'completed' && job.recommendation_id) {
          setGenerating(false);
          setCurrentJobId(null);
          setGenMode(null);
          const recResponse = await recommendationsApi.getById(
            job.recommendation_id
          );
          if (recResponse.success && recResponse.data) {
            onRecommendationUpdate(recResponse.data);
            const wRes = await recommendationsApi.getWorkouts(
              job.recommendation_id
            );
            if (wRes.success && wRes.data) {
              setWorkoutsForLock(wRes.data);
            }
          }
        } else if (job.status === 'failed') {
          setError(job.error_message || 'Generation failed');
          setGenerating(false);
          setCurrentJobId(null);
          setGenMode(null);
        } else if (job.status === 'cancelled') {
          setGenerating(false);
          setCurrentJobId(null);
          setGenMode(null);
          setCancelled(true);
          setCurrentStep('Cancelled');
        } else if (job.status === 'pending' || job.status === 'processing') {
          setTimeout(() => pollJobStatus(jobId), 15000);
        }
      } catch {
        setError('Failed to check generation status');
        setGenerating(false);
        setGenMode(null);
      }
    },
    [onRecommendationUpdate]
  );

  const checkForExistingJob = useCallback(
    async (questionnaireId: number) => {
      try {
        const jobResponse =
          await recommendationsApi.getLatestJobByQuestionnaireId(
            questionnaireId
          );

        if (jobResponse.success && jobResponse.data) {
          const job = jobResponse.data;

          if (job.status === 'pending' || job.status === 'processing') {
            setGenerating(true);
            const mode = (job.metadata as { mode?: string } | null)?.mode;
            if (mode === 'library_template') {
              setGenMode('library');
            } else if (mode === 'manual_plan') {
              setGenMode('manual');
            } else {
              setGenMode('plan');
            }
            setCurrentJobId(job.id);
            if (job.current_step) {
              setCurrentStep(job.current_step);
            }
            setTimeout(() => pollJobStatus(job.id), 1000);
          } else if (job.status === 'cancelled') {
            setCancelled(true);
            setCurrentStep('Cancelled');
          } else if (job.status === 'completed' && job.recommendation_id) {
            const recResponse =
              await recommendationsApi.getByQuestionnaireId(questionnaireId);
            if (recResponse.success && recResponse.data) {
              onRecommendationUpdate(recResponse.data);
              const wRes = await recommendationsApi.getWorkouts(
                job.recommendation_id
              );
              if (wRes.success && wRes.data) {
                setWorkoutsForLock(wRes.data);
              }
            }
          }
        }
      } catch {
        // Job might not exist
      }
    },
    [pollJobStatus, onRecommendationUpdate]
  );

  useEffect(() => {
    const checkInBodyScan = async () => {
      try {
        const [hasRes, listRes] = await Promise.all([
          inbodyScansApi.hasScan(clientId),
          inbodyScansApi.getByClientId(clientId),
        ]);
        const listVerified = Boolean(
          listRes.success && listRes.data?.some((s) => s.verified === true)
        );
        const apiVerified =
          hasRes.success && hasRes.data
            ? hasRes.data.has_verified_scan === true
            : false;
        if (hasRes.success && hasRes.data) {
          setHasAnyScan(hasRes.data.has_scan);
          setHasVerifiedScan(apiVerified || listVerified);
        } else if (listRes.success && listRes.data) {
          setHasAnyScan(listRes.data.length > 0);
          setHasVerifiedScan(listVerified);
        }
      } catch {
        // ignore
      } finally {
        setCheckingScan(false);
      }
    };

    if (clientId) {
      checkInBodyScan();
    }
  }, [clientId]);

  useEffect(() => {
    if (questionnaire?.id) {
      checkForExistingJob(questionnaire.id);
    }
  }, [questionnaire?.id, checkForExistingJob]);

  useEffect(() => {
    if (!recommendation) {
      return;
    }
    const origin = getPlanOriginFromRecommendation(recommendation);
    if (origin === 'library') {
      setInitialPlanMode('library');
    } else if (origin === 'ai') {
      setInitialPlanMode('ai');
    } else if (origin === 'manual') {
      setInitialPlanMode('manual');
    }
  }, [recommendation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPlanTemplatesLoading(true);
      setPlanTemplatesError('');
      const res = await recommendationsApi.getPlanTemplates();
      if (cancelled) return;
      if (res.success && res.data) {
        setPlanTemplates(res.data);
      } else {
        setPlanTemplatesError(res.error || 'Could not load plan library');
      }
      setPlanTemplatesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPlanTemplates = useMemo(() => {
    if (goalFilter === 'all') return planTemplates;
    return planTemplates.filter((t) => t.goal_category === goalFilter);
  }, [planTemplates, goalFilter]);

  const handleApplyPlanTemplate = async (templateId: string) => {
    if (!questionnaire) {
      router.push(`/clients/${clientId}/questionnaire`);
      return;
    }
    if (hasVerifiedScan !== true) {
      setError(
        'Upload and verify an InBody scan before applying a plan from the library.'
      );
      return;
    }
    if (eligibleTrainers.length > 0 && selectedTrainerId == null) {
      setError('Select a coach in step 1 before applying a library plan.');
      return;
    }

    setApplyingTemplateId(templateId);
    setError('');
    setGenerating(true);
    setGenMode('library');
    setCancelled(false);
    setCurrentStep('Starting library job…');
    try {
      const res = await recommendationsApi.applyPlanTemplate(templateId, {
        questionnaire_id: questionnaire.id,
        ...(selectedTrainerId != null ? { trainer_id: selectedTrainerId } : {}),
      });
      const jobId = res.success ? res.data?.job_id : undefined;
      if (jobId != null) {
        setCurrentJobId(jobId);
        setTimeout(() => void pollJobStatus(jobId), 1000);
      } else {
        setError(res.error || 'Failed to start library plan job');
        setGenerating(false);
        setGenMode(null);
        setCurrentStep('');
      }
    } catch {
      setError('Failed to start library plan job');
      setGenerating(false);
      setGenMode(null);
      setCurrentStep('');
    } finally {
      setApplyingTemplateId(null);
    }
  };

  const handleManualPlanSubmit = async (payload: ManualPlanStartPayload) => {
    setError('');
    setGenerating(true);
    setGenMode('manual');
    setCancelled(false);
    setCurrentStep('Starting manual plan job…');
    const res = await recommendationsApi.startManualPlan(payload);
    const jobId = res.success ? res.data?.job_id : undefined;
    if (jobId != null) {
      setCurrentJobId(jobId);
      setTimeout(() => void pollJobStatus(jobId), 1000);
    } else {
      setError(res.error || 'Failed to start manual mesocycle job');
      setGenerating(false);
      setGenMode(null);
      setCurrentStep('');
    }
  };

  const handleCoachFitAnalysis = async () => {
    if (!questionnaire) return;
    if (hasVerifiedScan !== true) {
      setError(
        'Upload and verify an InBody scan before running coach fit analysis.'
      );
      return;
    }
    if (threeCoaches.length < 3) {
      setCoachFitError(
        'Need at least three trainers with personas for AI fit.'
      );
      return;
    }

    setCoachFitLoading(true);
    setCoachFitError('');
    setError('');
    try {
      const res = await recommendationsApi.coachFitAnalysis(questionnaire.id);
      if (res.success && res.data) {
        const normalized = normalizeCoachFitAnalysis(res.data.analysis);
        if (normalized) {
          setCoachFit(normalized);
          setSelectedTrainerId(normalized.recommended_trainer_id);
          await onRefresh?.();
        } else {
          setCoachFit(null);
          setCoachFitError(
            'Coach fit response was incomplete. Try again or refresh the page.'
          );
        }
      } else {
        setCoachFitError(res.error || 'Coach fit analysis failed');
      }
    } catch {
      setCoachFitError('Coach fit analysis failed');
    } finally {
      setCoachFitLoading(false);
    }
  };

  const handleGenerateRecommendation = async () => {
    if (!questionnaire) {
      router.push(`/clients/${clientId}/questionnaire`);
      return;
    }

    if (hasVerifiedScan !== true) {
      setError(
        'Upload and verify an InBody scan before generating recommendations.'
      );
      return;
    }

    if (eligibleTrainers.length > 0 && selectedTrainerId == null) {
      setError('Select a coach before generating the plan.');
      return;
    }

    setGenerating(true);
    setGenMode('plan');
    setError('');
    setCancelled(false);
    setCurrentStep('Starting generation...');

    try {
      const startResponse =
        await recommendationsApi.startGenerationFromQuestionnaire(
          questionnaire.id,
          selectedTrainerId != null
            ? { trainer_id: selectedTrainerId }
            : undefined
        );

      if (!startResponse.success || !startResponse.data) {
        setError(startResponse.error || 'Failed to start generation');
        setGenerating(false);
        setGenMode(null);
        return;
      }

      const jobId = startResponse.data.job_id;
      setCurrentJobId(jobId);

      setTimeout(() => pollJobStatus(jobId), 1000);
    } catch {
      setError('Failed to start generation');
      setGenerating(false);
      setGenMode(null);
      setCurrentJobId(null);
    }
  };

  const handleCancelJob = async () => {
    if (!currentJobId) return;

    setCancelling(true);
    try {
      const response = await recommendationsApi.cancelJob(
        currentJobId,
        'Cancelled by user'
      );

      if (response.success && response.data) {
        setGenerating(false);
        setCurrentJobId(null);
        setGenMode(null);
        setCancelled(true);
        setCurrentStep('Cancelled');
      } else {
        setError(response.error || 'Failed to cancel job');
      }
    } catch {
      setError('Failed to cancel job');
    } finally {
      setCancelling(false);
    }
  };

  const planOrigin = getPlanOriginFromRecommendation(recommendation);
  const planLib = getPlanLibraryMeta(recommendation);

  const generateButton = questionnaire ? (
    <Button
      size="sm"
      onClick={handleGenerateRecommendation}
      disabled={
        generating ||
        checkingScan ||
        hasVerifiedScan !== true ||
        (eligibleTrainers.length > 0 && selectedTrainerId == null)
      }
      title={
        hasVerifiedScan !== true
          ? 'Upload and verify an InBody scan before generating'
          : eligibleTrainers.length > 0 && selectedTrainerId == null
            ? 'Select a coach first'
            : undefined
      }
    >
      {generating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          {recommendation ? 'Regenerate plan' : 'Generate & lock plan'}
        </>
      )}
    </Button>
  ) : null;

  return (
    <Card
      id="training-plans-section"
      className={cn(embedded && 'border-0 bg-muted/15 shadow-none')}
    >
      {!embedded && (
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Coach &amp; initial plan
            {planSetupLocked ? (
              <Badge variant="secondary" className="font-normal">
                Locked
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {embedded && planSetupLocked && (
          <Alert className="mb-4 border-muted-foreground/40 bg-muted/30">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-sm">
              Initial coach &amp; plan are locked — this client has mesocycle
              sessions. Historic plans and edits here will come in a future
              update.
            </AlertDescription>
          </Alert>
        )}

        {questionnaire && (
          <>
            {sessionsLoadingForLock && (
              <Alert className="mb-4 border-border/60 bg-muted/30">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Checking mesocycle sessions…
                </AlertDescription>
              </Alert>
            )}
            {!planSetupLocked ? (
              <>
                <div
                  className={cn(
                    'mb-8 space-y-4',
                    sessionsLoadingForLock &&
                      'pointer-events-none opacity-[0.65]'
                  )}
                >
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  1. Pick a coach
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose one of your first three coaches (alphabetically) or ask
                  AI who fits this client best — then lock that persona for plan
                  generation. No multi-plan comparison.
                </p>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.05] to-muted/20 p-4 shadow-sm dark:from-primary/10">
                {trainersLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    Loading coaches…
                  </div>
                ) : eligibleTrainers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Add trainers and generate personas in{' '}
                    <Link
                      href="/trainers"
                      className="font-medium text-primary underline underline-offset-2"
                    >
                      Trainers
                    </Link>{' '}
                    to steer AI plans. You can still generate without a linked
                    coach.
                  </p>
                ) : (
                  <>
                    {threeCoaches.length < 3 && (
                      <p className="text-xs text-amber-800 dark:text-amber-200 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2">
                        AI coach fit needs <strong>three</strong> trainers with
                        personas. You have {eligibleTrainers.length}; add more
                        in Trainers, or pick a coach manually below.
                      </p>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <UserCircle2 className="h-4 w-4 text-primary shrink-0" />
                        Select a coach
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="border border-primary/30 bg-background"
                        disabled={
                          coachFitLoading ||
                          generating ||
                          checkingScan ||
                          hasVerifiedScan !== true ||
                          threeCoaches.length < 3
                        }
                        onClick={() => void handleCoachFitAnalysis()}
                      >
                        {coachFitLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing fit…
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Suggest
                          </>
                        )}
                      </Button>
                    </div>

                    {coachFitError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{coachFitError}</AlertDescription>
                      </Alert>
                    )}

                    {coachFit?.recommendation?.reasoning ? (
                      <Alert className="mb-4 border-emerald-500/35 bg-emerald-500/[0.07]">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <AlertDescription className="space-y-2">
                          <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                            Suggestion
                          </p>
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            {coachFit.recommendation.reasoning}
                          </p>
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    <RadioGroup
                      value={
                        selectedTrainerId != null
                          ? String(selectedTrainerId)
                          : undefined
                      }
                      onValueChange={(v) =>
                        setSelectedTrainerId(parseInt(v, 10))
                      }
                      className="grid gap-3 sm:grid-cols-3"
                    >
                      {threeCoaches.map((t) => {
                        const isAiPick =
                          coachFit?.recommended_trainer_id === t.id;
                        return (
                          <div
                            key={t.id}
                            className={cn(
                              'relative rounded-xl border-2 bg-background/90 p-3 text-left transition-shadow',
                              isAiPick
                                ? 'border-emerald-500/60 shadow-md ring-2 ring-emerald-500/20'
                                : 'border-border/70 hover:border-primary/35'
                            )}
                          >
                            {isAiPick && (
                              <span className="absolute -top-2.5 left-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                                AI pick
                              </span>
                            )}
                            <div className="flex items-start gap-2.5 pt-1">
                              <RadioGroupItem
                                value={String(t.id)}
                                id={`coach-${t.id}`}
                                className="mt-2.5"
                              />
                              <Avatar
                                className={cn(
                                  'h-12 w-12 shrink-0 rounded-full border-2 border-border/70 shadow-sm',
                                  selectedTrainerId === t.id &&
                                    'border-primary ring-2 ring-primary/25'
                                )}
                              >
                                {t.image_url ? (
                                  <AvatarImage
                                    src={t.image_url}
                                    alt=""
                                    className="object-cover"
                                  />
                                ) : null}
                                <AvatarFallback className="rounded-full bg-primary/15 text-sm font-semibold text-primary">
                                  {`${t.first_name?.[0] ?? ''}${t.last_name?.[0] ?? ''}`}
                                </AvatarFallback>
                              </Avatar>
                              <Label
                                htmlFor={`coach-${t.id}`}
                                className="min-w-0 flex-1 cursor-pointer space-y-0.5 pt-0.5 font-normal"
                              >
                                <span className="block text-sm font-semibold text-foreground">
                                  {t.first_name} {t.last_name}
                                </span>
                                {t.title ? (
                                  <span className="block text-xs text-muted-foreground">
                                    {t.title}
                                  </span>
                                ) : null}
                              </Label>
                            </div>
                          </div>
                        );
                      })}
                    </RadioGroup>

                    {eligibleTrainers.length > 3 && (
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Showing your first three coaches with personas (by
                        name). Add or reorder in Trainers if you need different
                        options on this screen.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div
              className={cn(
                'space-y-4',
                sessionsLoadingForLock && 'pointer-events-none opacity-[0.65]'
              )}
            >
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  2. Lock in the initial plan
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose a path — the section below updates to match. You can
                  switch anytime.
                </p>
              </div>

              {recommendation ? (
                <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/[0.07] p-4 shadow-sm dark:bg-emerald-500/[0.09]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-100">
                        Current mesocycle
                      </p>
                      <p className="text-sm text-foreground">
                        {planOrigin === 'library' && planLib.templateName ? (
                          <>
                            <span className="text-muted-foreground">
                              Plan library:{' '}
                            </span>
                            <span className="font-semibold">
                              {planLib.templateName}
                            </span>
                          </>
                        ) : planOrigin === 'library' ? (
                          <span className="font-medium">
                            Plan library (template metadata not stored — older
                            save)
                          </span>
                        ) : planOrigin === 'ai' ? (
                          <span className="font-medium">
                            Generated with AI from questionnaire + InBody
                          </span>
                        ) : planOrigin === 'manual' ? (
                          <span className="font-medium">
                            Defined manually (custom structure)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Saved plan — choose a path below to see how it was
                            built, or regenerate.
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 border-emerald-500/30 bg-emerald-500/15 text-emerald-950 dark:text-emerald-50"
                    >
                      Active
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    The path below highlights how this plan was created. You can
                    switch views without losing the saved mesocycle.
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setInitialPlanMode('library')}
                  className={cn(
                    'group relative flex w-full flex-col gap-2 rounded-2xl border bg-gradient-to-br p-4 text-left shadow-sm transition-all duration-200',
                    'from-primary/[0.08] via-background to-muted/20 hover:shadow-md',
                    initialPlanMode === 'library'
                      ? 'border-primary/60 ring-2 ring-primary/35 shadow-md'
                      : 'border-border/70 hover:border-primary/35'
                  )}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                    <BookOpen className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    Plan library
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Pick a template — we save the mesocycle; you generate
                    workouts when ready.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setInitialPlanMode('ai')}
                  className={cn(
                    'group relative flex w-full flex-col gap-2 rounded-2xl border bg-gradient-to-br p-4 text-left shadow-sm transition-all duration-200',
                    'from-violet-500/[0.06] via-background to-muted/20 hover:shadow-md',
                    initialPlanMode === 'ai'
                      ? 'border-violet-500/55 ring-2 ring-violet-500/35 shadow-md'
                      : 'border-border/70 hover:border-violet-500/35'
                  )}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md dark:bg-violet-500">
                    <Sparkles className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    AI custom plan
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Generate a tailored direction from questionnaire + InBody.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setInitialPlanMode('manual')}
                  className={cn(
                    'group relative flex w-full flex-col gap-2 rounded-2xl border bg-gradient-to-br p-4 text-left shadow-sm transition-all duration-200',
                    'from-amber-500/[0.07] via-background to-muted/20 hover:shadow-md',
                    initialPlanMode === 'manual'
                      ? 'border-amber-500/55 ring-2 ring-amber-500/35 shadow-md'
                      : 'border-border/70 hover:border-amber-500/35'
                  )}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md dark:bg-amber-500">
                    <PenLine className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    Build manually
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Shape the plan yourself in the editor.
                  </span>
                </button>
              </div>

              {initialPlanMode === 'library' && (
                <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.06] via-muted/30 to-muted/10 shadow-sm dark:from-primary/10 dark:via-muted/20">
                  <div className="border-b border-primary/15 bg-primary/[0.07] px-4 py-3 dark:bg-primary/10">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <BookOpen className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-base font-semibold tracking-tight text-foreground">
                          Plan library
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Color shows{' '}
                          <span className="font-medium text-foreground">
                            goal
                          </span>
                          , pills show{' '}
                          <span className="font-medium text-foreground">
                            level &amp; phase type
                          </span>
                          . Click{' '}
                          <span className="font-medium text-foreground">
                            Use this plan
                          </span>{' '}
                          to save the mesocycle. Then go to the{' '}
                          <span className="font-medium text-foreground">
                            Workouts
                          </span>{' '}
                          tab, run{' '}
                          <span className="font-medium text-foreground">
                            Generate workouts
                          </span>
                          , review the draft, and save.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-background/90 p-3 shadow-sm sm:flex-row sm:items-end sm:justify-between">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Filter
                            className="h-3.5 w-3.5 text-primary"
                            aria-hidden
                          />
                          Narrow the list
                        </div>
                        <Label htmlFor="goal-filter" className="sr-only">
                          Filter by goal
                        </Label>
                        <Select
                          value={goalFilter}
                          onValueChange={(v) =>
                            setGoalFilter(v as 'all' | PlanTemplateGoalCategory)
                          }
                        >
                          <SelectTrigger
                            id="goal-filter"
                            className="h-10 w-full max-w-md border-primary/25 bg-background text-sm font-medium shadow-none sm:w-[min(100%,280px)]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All goals</SelectItem>
                            <SelectItem value="general_fitness">
                              General fitness
                            </SelectItem>
                            <SelectItem value="fat_loss">Fat loss</SelectItem>
                            <SelectItem value="muscle_gain">
                              Muscle gain
                            </SelectItem>
                            <SelectItem value="strength">Strength</SelectItem>
                            <SelectItem value="athletic_performance">
                              Athletic performance
                            </SelectItem>
                            <SelectItem value="health_longevity">
                              Health &amp; longevity
                            </SelectItem>
                            <SelectItem value="return_to_training">
                              Return to training
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <p className="text-xs leading-relaxed text-muted-foreground sm:max-w-md">
                        {eligibleTrainers.length > 0 ? (
                          <>
                            Library templates use the{' '}
                            <span className="font-medium text-foreground">
                              coach you selected in step 1
                            </span>{' '}
                            so workouts match that persona and your exercise
                            library.
                          </>
                        ) : (
                          <>
                            Add trainers with personas in{' '}
                            <Link
                              href="/trainers"
                              className="font-medium text-primary underline underline-offset-2"
                            >
                              Trainers
                            </Link>{' '}
                            to steer AI-generated workouts from templates.
                          </>
                        )}
                      </p>
                    </div>

                    {planTemplatesLoading && (
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/25 bg-background/80 py-10 text-sm font-medium text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        Loading templates…
                      </div>
                    )}

                    {planTemplatesError && !planTemplatesLoading && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {planTemplatesError}
                        </AlertDescription>
                      </Alert>
                    )}

                    {!planTemplatesLoading &&
                      !planTemplatesError &&
                      filteredPlanTemplates.length === 0 && (
                        <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/40 py-10 text-center text-sm text-muted-foreground">
                          No templates match this filter — try{' '}
                          <span className="font-medium text-foreground">
                            All goals
                          </span>
                          .
                        </div>
                      )}

                    {!planTemplatesLoading && !planTemplatesError && (
                      <ScrollArea className="h-[min(440px,52vh)] pr-2">
                        <div className="space-y-3 pb-1">
                          {filteredPlanTemplates.map((t) => {
                            const gv = GOAL_VISUAL[t.goal_category];
                            const ev = EXPERIENCE_BADGE[t.experience_level];
                            const isCurrentPlan =
                              planLib.templateId != null &&
                              planLib.templateId === t.id;
                            return (
                              <div
                                key={t.id}
                                className={cn(
                                  'overflow-hidden rounded-xl border border-border/70 border-l-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md',
                                  gv.leftBar,
                                  isCurrentPlan &&
                                    'ring-2 ring-primary/45 shadow-md'
                                )}
                              >
                                <div className={cn('p-4 sm:p-5', gv.cardTint)}>
                                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 flex-1 space-y-3">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className={cn(
                                            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
                                            gv.goalBadge
                                          )}
                                        >
                                          {gv.shortLabel}
                                        </span>
                                        <span
                                          className={cn(
                                            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
                                            ev.className
                                          )}
                                        >
                                          {ev.label}
                                        </span>
                                        {t.has_session_blueprints ? (
                                          <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                            Exercise blueprint
                                          </span>
                                        ) : null}
                                        {isCurrentPlan ? (
                                          <span className="inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                                            Your current plan
                                          </span>
                                        ) : null}
                                      </div>
                                      <div>
                                        <h4 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                                          {t.name}
                                        </h4>
                                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                          {t.summary}
                                        </p>
                                      </div>
                                      <p className="text-xs font-medium uppercase tracking-wide text-primary/90">
                                        {t.mesocycle_type}
                                      </p>
                                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        <div className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-2">
                                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <Calendar className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                            Frequency
                                          </div>
                                          <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                                            {t.sessions_per_week}× / week
                                          </p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-2">
                                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <Clock className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                            Session
                                          </div>
                                          <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                                            {t.session_length_minutes} min
                                          </p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-2">
                                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <Layers className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                                            Phase
                                          </div>
                                          <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                                            {t.phase_1_weeks} wk block
                                          </p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-2">
                                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <Flame className="h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-orange-400" />
                                            Intensity
                                          </div>
                                          <p className="mt-1 text-sm font-bold leading-tight text-foreground">
                                            {t.intensity_label}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:items-stretch lg:w-auto lg:pt-1 lg:pl-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="default"
                                        className="w-full min-w-[9rem] font-semibold shadow-sm lg:w-auto"
                                        onClick={() =>
                                          setDetailTemplateId(t.id)
                                        }
                                      >
                                        <Info
                                          className="mr-2 h-4 w-4 opacity-80"
                                          aria-hidden
                                        />
                                        Details
                                      </Button>
                                      <Button
                                        size="default"
                                        className="w-full min-w-[9rem] font-semibold shadow-sm lg:w-auto"
                                        disabled={
                                          applyingTemplateId !== null ||
                                          checkingScan ||
                                          hasVerifiedScan !== true ||
                                          generating ||
                                          (eligibleTrainers.length > 0 &&
                                            selectedTrainerId == null)
                                        }
                                        onClick={() =>
                                          void handleApplyPlanTemplate(t.id)
                                        }
                                      >
                                        {applyingTemplateId === t.id ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Applying…
                                          </>
                                        ) : isCurrentPlan ? (
                                          'Re-apply template'
                                        ) : (
                                          'Use this plan'
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              )}

              {initialPlanMode === 'ai' && (
                <div className="flex flex-col gap-3 rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.06] to-background p-4 sm:flex-row sm:items-start sm:justify-between dark:from-violet-500/10">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-700 dark:text-violet-200">
                      <Sparkles className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Generate with AI
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Tailored to questionnaire + InBody — runs as an async
                        job (more time &amp; cost than the library).
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 sm:pt-0.5">{generateButton}</div>
                </div>
              )}

              {initialPlanMode === 'manual' && questionnaire && (
                <ManualMesocycleForm
                  questionnaireId={questionnaire.id}
                  trainerId={selectedTrainerId}
                  coachRequired={eligibleTrainers.length > 0}
                  disabled={
                    checkingScan ||
                    hasVerifiedScan !== true ||
                    generating ||
                    trainersLoading
                  }
                  onSubmit={handleManualPlanSubmit}
                />
              )}

              {initialPlanMode === null && (
                <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-gradient-to-b from-muted/30 to-muted/10 px-6 py-14 text-center shadow-inner">
                  <p className="text-sm text-muted-foreground">
                    Choose a path above — plan library, AI, or manual — to
                    continue locking in the initial plan.
                  </p>
                </div>
              )}

              {!checkingScan && hasAnyScan === false && (
                <Alert className="mb-6">
                  <AlertDescription>
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        Upload at least one InBody scan, then verify extracted
                        data before generating.
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const element = document.getElementById(
                            'inbody-scans-section'
                          );
                          element?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            const element = document.getElementById(
                              'inbody-scans-section'
                            );
                            element?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                      >
                        Go to InBody
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {!checkingScan &&
                hasAnyScan === true &&
                hasVerifiedScan === false && (
                  <Alert className="mb-6 border-amber-500/40 bg-amber-500/[0.06]">
                    <AlertDescription>
                      <div className="flex items-center justify-between gap-3">
                        <span>
                          Verify your InBody scan (review extracted values and
                          confirm) before applying a library template or
                          generating a plan.
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            document
                              .getElementById('inbody-scans-section')
                              ?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          Review scan
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

              {generating && (
                <Alert className="mb-6 border-primary/50 bg-primary/5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {genMode === 'library'
                              ? 'Building mesocycle from library…'
                              : genMode === 'manual'
                                ? 'Saving manual mesocycle…'
                                : 'Generating AI mesocycle…'}
                          </span>
                        </div>
                        {currentStep && (
                          <span className="text-sm text-muted-foreground">
                            {currentStep}
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {genMode === 'library' || genMode === 'manual'
                            ? 'Saving the mesocycle only. Generate workouts from the Workouts tab when the job finishes.'
                            : 'Saving the AI plan structure. Generate workouts from the Workouts tab when the job finishes.'}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelJob}
                        disabled={cancelling}
                        className="ml-4"
                      >
                        {cancelling ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Cancelling…
                          </>
                        ) : (
                          <>
                            <X className="mr-2 h-3 w-3" />
                            Cancel
                          </>
                        )}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {cancelled && (
                <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/5">
                  <AlertDescription className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-2">
                        <span className="font-medium text-yellow-700 dark:text-yellow-400">
                          Generation cancelled
                        </span>
                        <span className="text-sm text-muted-foreground">
                          The training plan generation was cancelled. You can
                          start a new generation when ready.
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCancelled(false);
                          setCurrentStep('');
                        }}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {!recommendation && (
                <p className="text-sm text-muted-foreground">
                  No training plan yet.{' '}
                  {questionnaire
                    ? 'Generate one to get started.'
                    : 'Fill out the questionnaire first.'}
                </p>
              )}
            </div>
          </>
        ) : recommendation ? (
          <LockedCoachPlanReadonly
            clientId={clientId}
            recommendation={recommendation}
            planOrigin={planOrigin}
            planLib={planLib}
            trainer={lockedTrainer}
          />
        ) : null}

        {recommendation && (
          <div className="mt-6 space-y-4">
            <Alert className="border-green-500/45 bg-green-500/[0.06]">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="space-y-3">
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Mesocycle saved for this client
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {planLib.libraryBuiltWorkouts
                      ? 'Sessions were built from the library template (with load refinement). Review the mesocycle to swap exercises or tune loads.'
                      : 'Add or refine sessions from the Workouts tab — generate with AI, then review and save, or edit workouts directly.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {planLib.libraryBuiltWorkouts ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        router.push(
                          `/clients/${clientId}/recommendations/${recommendation.id}/workouts-review`
                        );
                      }}
                    >
                      Review mesocycle workouts
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant={
                      planLib.libraryBuiltWorkouts ? 'outline' : 'default'
                    }
                    onClick={() => {
                      router.push(`/clients/${clientId}?tab=workouts`);
                    }}
                  >
                    Open Workouts tab
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      router.push(
                        `/clients/${clientId}/recommendations/${recommendation.id}`
                      );
                    }}
                  >
                    Plan details
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
            <Link
              href={
                generating
                  ? '#'
                  : `/clients/${clientId}/recommendations/${recommendation.id}`
              }
              className={
                generating
                  ? 'pointer-events-none opacity-50 cursor-not-allowed'
                  : ''
              }
              onClick={(e) => {
                if (generating) {
                  e.preventDefault();
                }
              }}
            >
              <Card className="transition-colors cursor-pointer hover:bg-muted">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1">
                        {recommendation.client_type}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {recommendation.sessions_per_week} sessions/week •{' '}
                        {recommendation.session_length_minutes} min/session
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {recommendation.training_style}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Generate sessions from the Workouts tab (or below), then
                        review and save.
                      </p>
                    </div>
                    <Badge>{recommendation.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <GenerateWorkoutsPanel
              clientId={clientId}
              recommendation={recommendation}
              onSaved={async () => {
                await refreshWorkoutsForLock();
                await onRefresh?.();
              }}
            />
          </div>
        )}
      </>
        )}
      </CardContent>
      <PlanTemplateDetailDialog
        open={detailTemplateId !== null}
        onOpenChange={(o) => {
          if (!o) setDetailTemplateId(null);
        }}
        templateId={detailTemplateId}
      />
    </Card>
  );
}
