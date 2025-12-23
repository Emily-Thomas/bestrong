'use client';

import { Loader2, Sparkles } from 'lucide-react';
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
import {
  type Questionnaire,
  type Recommendation,
  recommendationsApi,
  inbodyScansApi,
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
  const [currentStep, setCurrentStep] = useState<string>('');
  const [completed, setCompleted] = useState(false);
  const [completedRecommendationId, setCompletedRecommendationId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [hasInBodyScan, setHasInBodyScan] = useState<boolean | null>(null);
  const [checkingScan, setCheckingScan] = useState(true);

  // Poll for job status
  const pollJobStatus = useCallback(async (jobId: number) => {
    try {
      const statusResponse = await recommendationsApi.getJobStatus(jobId);

      if (!statusResponse.success || !statusResponse.data) {
        setError('Failed to check generation status');
        setGenerating(false);
        return;
      }

      const job = statusResponse.data;

      // Update current step
      if (job.current_step) {
        setCurrentStep(job.current_step);
      }

      // Check if job is complete
      if (job.status === 'completed' && job.recommendation_id) {
        setGenerating(false);
        setCompleted(true);
        setCompletedRecommendationId(job.recommendation_id);
        // Reload recommendation
        const recResponse = await recommendationsApi.getById(job.recommendation_id);
        if (recResponse.success && recResponse.data) {
          onRecommendationUpdate(recResponse.data);
        }
      } else if (job.status === 'failed') {
        setError(job.error_message || 'Generation failed');
        setGenerating(false);
      } else if (job.status === 'pending' || job.status === 'processing') {
        // Continue polling (every 15 seconds)
        setTimeout(() => pollJobStatus(jobId), 15000);
      }
    } catch (error) {
      setError('Failed to check generation status');
      setGenerating(false);
    }
  }, [onRecommendationUpdate]);

  // Check for existing jobs and resume polling if needed
  const checkForExistingJob = useCallback(async (questionnaireId: number) => {
    try {
      const jobResponse = await recommendationsApi.getLatestJobByQuestionnaireId(questionnaireId);
      
      if (jobResponse.success && jobResponse.data) {
        const job = jobResponse.data;
        
        if (job.status === 'pending' || job.status === 'processing') {
          // Resume polling
          setGenerating(true);
          if (job.current_step) {
            setCurrentStep(job.current_step);
          }
          // Start polling
          setTimeout(() => pollJobStatus(job.id), 1000);
        } else if (job.status === 'completed' && job.recommendation_id) {
          // Show completion banner if recommendation doesn't exist yet
          const recResponse = await recommendationsApi.getByQuestionnaireId(questionnaireId);
          if (!recResponse.success || !recResponse.data) {
            setCompleted(true);
            setCompletedRecommendationId(job.recommendation_id);
          }
        }
      }
    } catch (error) {
      // Job might not exist, which is fine
    }
  }, [pollJobStatus]);

  // Check for InBody scan requirement
  useEffect(() => {
    const checkInBodyScan = async () => {
      try {
        const response = await inbodyScansApi.hasScan(clientId);
        if (response.success && response.data) {
          setHasInBodyScan(response.data.has_scan);
        }
      } catch (err) {
        console.error('Error checking InBody scan:', err);
      } finally {
        setCheckingScan(false);
      }
    };

    if (clientId) {
      checkInBodyScan();
    }
  }, [clientId]);

  // Check for existing jobs when questionnaire is loaded
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

    // Check InBody scan requirement
    if (hasInBodyScan === false) {
      setError('Please upload at least one InBody scan before generating recommendations.');
      return;
    }

    setGenerating(true);
    setError('');
    setCurrentStep('Starting generation...');

    try {
      // Start the async job
      const startResponse =
        await recommendationsApi.startGenerationFromQuestionnaire(questionnaire.id);

      if (!startResponse.success || !startResponse.data) {
        setError(startResponse.error || 'Failed to start generation');
        setGenerating(false);
        return;
      }

      const jobId = startResponse.data.job_id;

      // Start polling
      setTimeout(() => pollJobStatus(jobId), 1000);
    } catch (err) {
      setError('Failed to start generation');
      setGenerating(false);
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
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
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
                    // Scroll to InBody scans section
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

        {/* Non-intrusive loading banner */}
        {generating && (
          <Alert className="mb-6 border-primary/50 bg-primary/5">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Generating training plan...</span>
              </div>
              {currentStep && (
                <span className="text-sm text-muted-foreground">
                  {currentStep}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                This may take 30-60 seconds. You can navigate away and return later.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Completion banner */}
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
                    router.push(`/clients/${clientId}/recommendations/${completedRecommendationId}`);
                  }}
                >
                  View Plan
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
            className={generating ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}
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

