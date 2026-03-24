'use client';

import { Loader2, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  type Questionnaire,
  type Recommendation,
  type Trainer,
  recommendationsApi,
  inbodyScansApi,
  trainersApi,
} from '@/lib/api';

interface TrainingPlansSectionProps {
  clientId: number;
  questionnaire: Questionnaire | null;
  recommendation: Recommendation | null;
  onRecommendationUpdate: (recommendation: Recommendation | null) => void;
}

export function TrainingPlansSection({
  clientId,
  questionnaire,
  recommendation,
  onRecommendationUpdate,
}: TrainingPlansSectionProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [completed, setCompleted] = useState(false);
  const [completedRecommendationId, setCompletedRecommendationId] = useState<number | null>(
    null
  );
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState('');
  const [hasInBodyScan, setHasInBodyScan] = useState<boolean | null>(null);
  const [checkingScan, setCheckingScan] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [genMode, setGenMode] = useState<'plan' | 'comparison' | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(false);
  const [compareTrainerIds, setCompareTrainerIds] = useState<number[]>([]);
  const [completedComparisonBatchId, setCompletedComparisonBatchId] = useState<string | null>(
    null
  );

  const trainerReadyForComparison = (t: Trainer) =>
    Boolean(t.structured_persona?.ai_prompt_injection?.trim());

  const eligibleTrainers = trainers.filter(trainerReadyForComparison);

  const toggleCompareTrainer = (id: number) => {
    setCompareTrainerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

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
          const batchId = job.metadata?.comparison_batch_id;
          if (job.metadata?.mode === 'trainer_comparison' && batchId) {
            setGenerating(false);
            setCurrentJobId(null);
            setGenMode(null);
            setCompletedComparisonBatchId(batchId);
            setCompleted(true);
            setCompletedRecommendationId(null);
          } else {
            setGenerating(false);
            setCurrentJobId(null);
            setGenMode(null);
            setCompleted(true);
            setCompletedRecommendationId(job.recommendation_id);
            const recResponse = await recommendationsApi.getById(job.recommendation_id);
            if (recResponse.success && recResponse.data) {
              onRecommendationUpdate(recResponse.data);
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
          await recommendationsApi.getLatestJobByQuestionnaireId(questionnaireId);

        if (jobResponse.success && jobResponse.data) {
          const job = jobResponse.data;

          if (job.status === 'pending' || job.status === 'processing') {
            setGenerating(true);
            setGenMode(
              job.metadata?.mode === 'trainer_comparison' ? 'comparison' : 'plan'
            );
            setCurrentJobId(job.id);
            if (job.current_step) {
              setCurrentStep(job.current_step);
            }
            setTimeout(() => pollJobStatus(job.id), 1000);
          } else if (job.status === 'cancelled') {
            setCancelled(true);
            setCurrentStep('Cancelled');
          } else if (job.status === 'completed' && job.recommendation_id) {
            if (
              job.metadata?.mode === 'trainer_comparison' &&
              job.metadata.comparison_batch_id
            ) {
              setCompleted(true);
              setCompletedComparisonBatchId(job.metadata.comparison_batch_id);
              setCompletedRecommendationId(null);
            } else {
              const recResponse =
                await recommendationsApi.getByQuestionnaireId(questionnaireId);
              if (!recResponse.success || !recResponse.data) {
                setCompleted(true);
                setCompletedRecommendationId(job.recommendation_id);
              }
            }
          }
        }
      } catch {
        // Job might not exist
      }
    },
    [pollJobStatus]
  );

  useEffect(() => {
    const checkInBodyScan = async () => {
      try {
        const response = await inbodyScansApi.hasScan(clientId);
        if (response.success && response.data) {
          setHasInBodyScan(response.data.has_scan);
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

  const handleGenerateRecommendation = async () => {
    if (!questionnaire) {
      router.push(`/clients/${clientId}/questionnaire`);
      return;
    }

    if (hasInBodyScan === false) {
      setError('Please upload at least one InBody scan before generating recommendations.');
      return;
    }

    setGenerating(true);
    setGenMode('plan');
    setError('');
    setCancelled(false);
    setCurrentStep('Starting generation...');

    try {
      const startResponse =
        await recommendationsApi.startGenerationFromQuestionnaire(questionnaire.id);

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

  const handleCompareGeneration = async () => {
    if (!questionnaire) {
      router.push(`/clients/${clientId}/questionnaire`);
      return;
    }
    if (hasInBodyScan === false) {
      setError('Please upload at least one InBody scan before generating comparisons.');
      return;
    }
    if (compareTrainerIds.length < 2) {
      setError('Select at least two coaches to compare.');
      return;
    }

    setGenerating(true);
    setGenMode('comparison');
    setError('');
    setCancelled(false);
    setCurrentStep('Starting coach comparison...');

    try {
      const sortedIds = [...compareTrainerIds].sort((a, b) => a - b);
      const startResponse = await recommendationsApi.startComparisonFromQuestionnaire(
        questionnaire.id,
        sortedIds
      );

      if (!startResponse.success || !startResponse.data) {
        setError(startResponse.error || 'Failed to start comparison');
        setGenerating(false);
        setGenMode(null);
        return;
      }

      const jobId = startResponse.data.job_id;
      setCurrentJobId(jobId);
      setTimeout(() => pollJobStatus(jobId), 1000);
    } catch {
      setError('Failed to start comparison');
      setGenerating(false);
      setGenMode(null);
      setCurrentJobId(null);
    }
  };

  const handleCancelJob = async () => {
    if (!currentJobId) return;

    setCancelling(true);
    try {
      const response = await recommendationsApi.cancelJob(currentJobId, 'Cancelled by user');

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Training Plans</CardTitle>
          <CardDescription>
            AI-generated and customized recommendations
          </CardDescription>
        </div>
        {questionnaire && (
          <Button
            size="sm"
            onClick={handleGenerateRecommendation}
            disabled={generating || checkingScan || hasInBodyScan === false}
            title={
              hasInBodyScan === false
                ? 'Please upload at least one InBody scan before generating recommendations'
                : undefined
            }
          >
            {generating && genMode === 'plan' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {recommendation ? 'Regenerate Plan' : 'Generate Plan'}
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {questionnaire && (
          <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Compare coaching styles</p>
              <p className="text-xs text-muted-foreground">
                Generate side-by-side draft plans steered by different trainer personas. Each
                coach needs a generated persona (Trainers).
              </p>
            </div>
            {trainersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading trainers…
              </div>
            ) : eligibleTrainers.length < 2 ? (
              <p className="text-sm text-muted-foreground">
                Add at least two trainers with generated personas in{' '}
                <Link href="/trainers" className="underline underline-offset-2">
                  Trainers
                </Link>{' '}
                to use comparison.
              </p>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {eligibleTrainers.map((t) => {
                    const cid = `compare-trainer-${t.id}`;
                    return (
                      <div
                        key={t.id}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <Checkbox
                          id={cid}
                          checked={compareTrainerIds.includes(t.id)}
                          onCheckedChange={() => toggleCompareTrainer(t.id)}
                          disabled={
                            generating || checkingScan || hasInBodyScan === false
                          }
                        />
                        <Label htmlFor={cid} className="cursor-pointer font-normal">
                          {t.first_name} {t.last_name}
                          {t.title ? (
                            <span className="text-muted-foreground"> · {t.title}</span>
                          ) : null}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={
                    generating ||
                    checkingScan ||
                    hasInBodyScan === false ||
                    compareTrainerIds.length < 2
                  }
                  onClick={handleCompareGeneration}
                >
                  {generating && genMode === 'comparison' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Comparing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Compare selected coaches
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {!checkingScan && hasInBodyScan === false && (
          <Alert className="mb-6">
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  Please upload at least one InBody scan before generating recommendations.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const element = document.getElementById('inbody-scans-section');
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const element = document.getElementById('inbody-scans-section');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  Upload Scan
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
                      {genMode === 'comparison'
                        ? 'Generating coach comparison…'
                        : 'Generating training plan…'}
                    </span>
                  </div>
                  {currentStep && (
                    <span className="text-sm text-muted-foreground">{currentStep}</span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {genMode === 'comparison'
                      ? 'This may take a few minutes. You can navigate away and return later.'
                      : 'This may take 30-60 seconds. You can navigate away and return later.'}
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
                    The training plan generation was cancelled. You can start a new generation
                    when ready.
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

        {completed && completedRecommendationId && (
          <Alert className="mb-6 border-green-500/50 bg-green-500/5">
            <AlertDescription className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-700 dark:text-green-400">
                  Training plan generated successfully!
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCompleted(false);
                    setCompletedRecommendationId(null);
                    setCurrentStep('');
                  }}
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    router.push(
                      `/clients/${clientId}/recommendations/${completedRecommendationId}`
                    );
                  }}
                >
                  View Plan
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {completed && completedComparisonBatchId && (
          <Alert className="mb-6 border-green-500/50 bg-green-500/5">
            <AlertDescription className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-700 dark:text-green-400">
                  Coach comparison ready
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Review draft plans side by side for the coaches you selected.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCompleted(false);
                    setCompletedComparisonBatchId(null);
                    setCurrentStep('');
                  }}
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    router.push(
                      `/clients/${clientId}/compare/${completedComparisonBatchId}`
                    );
                  }}
                >
                  View comparison
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!recommendation ? (
          <p className="text-sm text-muted-foreground">
            No training plan yet.{' '}
            {questionnaire
              ? 'Generate one to get started.'
              : 'Fill out the questionnaire first.'}
          </p>
        ) : (
          <Link
            href={generating ? '#' : `/clients/${clientId}/recommendations/${recommendation.id}`}
            className={
              generating ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''
            }
            onClick={(e) => {
              if (generating) {
                e.preventDefault();
              }
            }}
          >
            <Card className="transition-colors cursor-pointer hover:bg-muted">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{recommendation.client_type}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {recommendation.sessions_per_week} sessions/week •{' '}
                      {recommendation.session_length_minutes} min/session
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {recommendation.training_style}
                    </p>
                  </div>
                  <Badge>{recommendation.status}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
