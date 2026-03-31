'use client';

import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Fast pre-session check-in aligned with common readiness screening:
 * sleep/rest, soreness, pain/injury (safety), and global readiness to train.
 * All primary inputs are binary or 3-option taps for speed on the floor.
 */
export interface PreWorkoutSurveyResponse {
  /** Rested enough for this session (sleep / recovery)? */
  rested_enough: boolean;
  /** More muscle soreness than usual from recent training? */
  elevated_soreness: boolean;
  /** New pain, sharp pain, or injury concern today? */
  pain_or_injury: boolean;
  /** Single-item readiness — common in sports science wellness checks */
  readiness: 'ready' | 'somewhat' | 'not_ready';
  injury_notes?: string;
  notes?: string;
}

interface PreWorkoutSurveyProps {
  open: boolean;
  onComplete: (responses: PreWorkoutSurveyResponse) => void;
  /** Optional — trainer can bypass; session still runs without check-in data. */
  onSkip: () => void;
  clientName?: string;
}

function YesNoRow({
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={value === true ? 'default' : 'outline'}
        className={cn(
          'h-12 text-base font-semibold',
          value === true && 'ring-2 ring-primary ring-offset-2'
        )}
        onClick={() => onChange(true)}
      >
        {yesLabel ?? 'Yes'}
      </Button>
      <Button
        type="button"
        variant={value === false ? 'default' : 'outline'}
        className={cn(
          'h-12 text-base font-semibold',
          value === false && 'ring-2 ring-primary ring-offset-2'
        )}
        onClick={() => onChange(false)}
      >
        {noLabel ?? 'No'}
      </Button>
    </div>
  );
}

export function PreWorkoutSurvey({
  open,
  onComplete,
  onSkip,
  clientName,
}: PreWorkoutSurveyProps) {
  const [rested, setRested] = useState<boolean | null>(null);
  const [soreness, setSoreness] = useState<boolean | null>(null);
  const [pain, setPain] = useState<boolean | null>(null);
  const [readiness, setReadiness] = useState<
    PreWorkoutSurveyResponse['readiness'] | null
  >(null);
  const [injuryNotes, setInjuryNotes] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setRested(null);
    setSoreness(null);
    setPain(null);
    setReadiness(null);
    setInjuryNotes('');
    setNotes('');
  };

  const handleSubmit = () => {
    if (
      rested === null ||
      soreness === null ||
      pain === null ||
      readiness === null
    ) {
      return;
    }

    const responses: PreWorkoutSurveyResponse = {
      rested_enough: rested,
      elevated_soreness: soreness,
      pain_or_injury: pain,
      readiness,
      injury_notes: injuryNotes.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onComplete(responses);
    reset();
  };

  const isComplete =
    rested !== null && soreness !== null && pain !== null && readiness !== null;

  const hasConcerns =
    pain === true ||
    readiness === 'not_ready' ||
    rested === false ||
    soreness === true ||
    readiness === 'somewhat';

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent
        className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-xl sm:text-2xl">
            Pre-workout check-in
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            {clientName
              ? `Quick taps for ${clientName} — about 20 seconds.`
              : 'Quick taps before you start — about 20 seconds.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-2">
            <Label className="text-sm font-semibold leading-snug">
              Rested enough for this session?
            </Label>
            <p className="text-xs text-muted-foreground">
              Adequate sleep / recovery since last training.
            </p>
            <YesNoRow value={rested} onChange={setRested} />
          </section>

          <section className="space-y-2">
            <Label className="text-sm font-semibold leading-snug">
              More muscle soreness than usual?
            </Label>
            <p className="text-xs text-muted-foreground">
              DOMS or soreness beyond what you&apos;d expect.
            </p>
            <YesNoRow value={soreness} onChange={setSoreness} />
          </section>

          <section className="space-y-2">
            <Label className="text-sm font-semibold leading-snug">
              New pain, sharp pain, or injury concern today?
            </Label>
            <p className="text-xs text-muted-foreground">
              Safety check — anything that should change the plan?
            </p>
            <YesNoRow value={pain} onChange={setPain} />
          </section>

          {pain === true && (
            <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <Label htmlFor="injury-notes" className="text-sm font-semibold">
                Where / what? (optional but helpful)
              </Label>
              <Textarea
                id="injury-notes"
                value={injuryNotes}
                onChange={(e) => setInjuryNotes(e.target.value)}
                placeholder="e.g. sharp knee pain on squats"
                rows={2}
                className="text-sm"
              />
            </div>
          )}

          <section className="space-y-2">
            <Label className="text-sm font-semibold leading-snug">
              Ready to train as planned?
            </Label>
            <p className="text-xs text-muted-foreground">
              One-tap readiness — scale back if not.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  { key: 'ready' as const, label: 'Ready' },
                  { key: 'somewhat' as const, label: 'Somewhat' },
                  { key: 'not_ready' as const, label: 'Not ready' },
                ] as const
              ).map(({ key, label }) => (
                <Button
                  key={key}
                  type="button"
                  variant={readiness === key ? 'default' : 'outline'}
                  className={cn(
                    'h-12 font-semibold',
                    readiness === key && 'ring-2 ring-primary ring-offset-2',
                    key === 'not_ready' &&
                      readiness === 'not_ready' &&
                      'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  )}
                  onClick={() => setReadiness(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </section>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-semibold">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else the coach should know…"
              rows={2}
              className="text-sm"
            />
          </div>

          {hasConcerns && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Consider scaling today:</strong> reduce load, volume, or
                swap movements if recovery, soreness, pain, or readiness suggest
                it.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="order-2 w-full sm:order-1 sm:w-auto"
            onClick={() => {
              reset();
              onSkip();
            }}
          >
            Skip check-in
          </Button>
          <Button
            type="button"
            size="lg"
            className="order-1 w-full font-semibold sm:order-2 sm:w-auto"
            disabled={!isComplete}
            onClick={handleSubmit}
          >
            Continue to workout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
