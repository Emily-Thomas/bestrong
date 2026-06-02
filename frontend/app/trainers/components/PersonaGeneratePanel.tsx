'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PERSONA_GENERATION_STEPS } from '../lib/trainer-utils';

type PersonaGeneratePanelProps = {
  hasPersona: boolean;
  generating: boolean;
  onGenerate: () => void;
  compact?: boolean;
};

export function PersonaGeneratePanel({
  hasPersona,
  generating,
  onGenerate,
  compact = false,
}: PersonaGeneratePanelProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!generating) {
      setStepIndex(0);
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      return;
    }
    const id = window.setInterval(() => {
      setStepIndex((i) => (i + 1) % PERSONA_GENERATION_STEPS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [generating]);

  if (compact && hasPersona) {
    return null;
  }

  const stepLabel = PERSONA_GENERATION_STEPS[stepIndex];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className={compact ? 'text-base' : 'text-lg'}>
          {hasPersona
            ? 'Refresh structured persona'
            : 'Build a structured persona'}
        </CardTitle>
        <CardDescription>
          {hasPersona
            ? 'Regenerate when raw coaching notes change so Scout stays aligned with this coach.'
            : 'Scout will read your free-form notes and produce pillars, client fit, and program context.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {generating ? (
          <div
            className="rounded-xl border border-border bg-muted/20 px-4 py-4"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex items-center gap-3">
              <Loader2
                className={cn(
                  'h-5 w-5 shrink-0 text-primary motion-reduce:animate-none',
                  'animate-spin'
                )}
                aria-hidden
              />
              <div>
                <p className="text-sm font-medium">Scout&apos;s working on it…</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{stepLabel}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              This can take up to a minute. Keep this tab open until it finishes.
            </p>
          </div>
        ) : (
          <Button
            type="button"
            onClick={onGenerate}
            className="gap-2"
            disabled={generating}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {hasPersona ? 'Regenerate persona' : 'Generate persona'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
