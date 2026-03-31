'use client';

import { CheckCircle2, Circle, X } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Questionnaire, Recommendation } from '@/lib/api';
import { QuestionnaireForm } from '../questionnaire/QuestionnaireForm';
import { InBodyScansSection } from './InBodyScansSection';
import { TrainingPlansSection } from './TrainingPlansSection';

interface ClientSetupWorkspaceProps {
  clientId: number;
  questionnaire: Questionnaire | null;
  recommendation: Recommendation | null;
  hasScan: boolean | null;
  hasVerifiedScan: boolean | null;
  onRefresh: () => void | Promise<void>;
  onRecommendationUpdate: (recommendation: Recommendation | null) => void;
  showWelcomeBanner: boolean;
  onDismissWelcome: () => void;
}

function StepStatus({ done }: { done: boolean }) {
  return done ? (
    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
  );
}

export function ClientSetupWorkspace({
  clientId,
  questionnaire,
  recommendation,
  hasScan,
  hasVerifiedScan,
  onRefresh,
  onRecommendationUpdate,
  showWelcomeBanner,
  onDismissWelcome,
}: ClientSetupWorkspaceProps) {
  const intakeDone = Boolean(questionnaire);
  const scanVerified = hasVerifiedScan === true;
  const intakeComplete = intakeDone && scanVerified;

  const intakeDefaultOpen = useMemo(() => {
    const keys: string[] = [];
    if (!intakeDone) keys.push('questionnaire');
    if (intakeDone && !scanVerified) keys.push('inbody');
    return keys.length ? keys : ['questionnaire'];
  }, [intakeDone, scanVerified]);

  const refreshInBodyParent = useCallback(() => {
    void onRefresh();
  }, [onRefresh]);

  const planDone = Boolean(recommendation);

  /** Phase 1: questionnaire + verified InBody only */
  if (!intakeComplete) {
    return (
      <Card
        id="client-setup-workspace"
        className={
          showWelcomeBanner
            ? 'border-primary/35 bg-primary/[0.03]'
            : 'border-border/80'
        }
      >
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-base">
                {showWelcomeBanner ? 'Welcome — intake' : 'Intake'}
              </CardTitle>
              <CardDescription>
                Complete the questionnaire and upload an InBody scan. Review
                and verify the scan when extraction finishes — then this page
                moves on to coach &amp; training plan.
              </CardDescription>
            </div>
            {showWelcomeBanner && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 -mt-1"
                onClick={onDismissWelcome}
                aria-label="Dismiss welcome banner"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {hasScan === true && hasVerifiedScan === false && (
            <Alert className="border-amber-500/40 bg-amber-500/[0.06]">
              <AlertDescription className="text-sm">
                You have a scan waiting — open it below and verify the
                extracted data to continue.
              </AlertDescription>
            </Alert>
          )}

          <Accordion
            key={intakeDefaultOpen.join(',')}
            type="multiple"
            defaultValue={intakeDefaultOpen}
            className="w-full rounded-lg border border-border/70 bg-muted/15"
          >
            <AccordionItem value="questionnaire" className="border-border/60 px-2">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="flex items-center gap-2 text-left">
                  <StepStatus done={intakeDone} />
                  <span>Questionnaire</span>
                  {intakeDone ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      Done
                    </span>
                  ) : (
                    <span className="text-xs font-normal text-amber-700 dark:text-amber-500">
                      Required
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="max-h-[min(75vh,880px)] overflow-y-auto pr-1">
                  <QuestionnaireForm
                    clientId={clientId}
                    embedded
                    onSuccess={() => {
                      void onRefresh();
                    }}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="inbody" className="border-border/60 px-2">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="flex items-center gap-2 text-left">
                  <StepStatus done={scanVerified} />
                  <span>InBody</span>
                  {hasVerifiedScan === null ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      Checking…
                    </span>
                  ) : scanVerified ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      Verified
                    </span>
                  ) : (
                    <span className="text-xs font-normal text-amber-700 dark:text-amber-500">
                      Upload &amp; verify
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <InBodyScansSection
                  clientId={clientId}
                  embedded
                  onUpdate={refreshInBodyParent}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    );
  }

  /** Phase 2: coach & plan — only after verified InBody */
  return (
    <div
      id="client-setup-workspace"
      className="space-y-4 animate-in fade-in duration-300"
    >
      <Alert className="border-emerald-500/35 bg-emerald-500/[0.06]">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <AlertDescription>
          Intake is complete. Pick a coach and lock in the initial plan — then
          use the Workouts tab to build sessions.
        </AlertDescription>
      </Alert>

      <Card
        className={
          showWelcomeBanner
            ? 'border-primary/35 bg-primary/[0.03]'
            : 'border-border/80'
        }
      >
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-base">Coach &amp; training plan</CardTitle>
              <CardDescription>
                Compare trainer personas if you like, then generate and lock the
                recommendation your client will start from.
              </CardDescription>
            </div>
            {showWelcomeBanner && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 -mt-1"
                onClick={onDismissWelcome}
                aria-label="Dismiss welcome banner"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-[min(78vh,900px)] overflow-y-auto pr-1">
            <TrainingPlansSection
              clientId={clientId}
              questionnaire={questionnaire}
              recommendation={recommendation}
              onRecommendationUpdate={onRecommendationUpdate}
              onRefresh={onRefresh}
              embedded
            />
          </div>
        </CardContent>
      </Card>

      {planDone && (
        <p className="text-center text-sm text-muted-foreground">
          Plan is on file — open Workouts when you are ready to schedule
          sessions.
        </p>
      )}
    </div>
  );
}
