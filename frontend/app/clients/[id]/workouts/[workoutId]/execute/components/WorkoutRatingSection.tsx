'use client';

import { Frown, Meh, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { touchActionClass } from '@/lib/touch-targets';
import { cn } from '@/lib/utils';
import {
  EXECUTE_PANEL_BODY,
  EXECUTE_PANEL_CLASS,
  EXECUTE_PANEL_HEADER,
} from '../lib/execute-ui-classes';

interface WorkoutRatingSectionProps {
  workoutRating?: 'happy' | 'meh' | 'sad';
  trainerObservations: string;
  sessionNotes: string;
  onRatingChange: (rating: 'happy' | 'meh' | 'sad') => void;
  onObservationsChange: (observations: string) => void;
  onSessionNotesChange: (notes: string) => void;
}

export function WorkoutRatingSection({
  workoutRating,
  trainerObservations,
  sessionNotes,
  onRatingChange,
  onObservationsChange,
  onSessionNotesChange,
}: WorkoutRatingSectionProps) {
  return (
    <section className={EXECUTE_PANEL_CLASS} aria-labelledby="wrap-up-heading">
      <div className={EXECUTE_PANEL_HEADER}>
        <h2 id="wrap-up-heading" className="text-sm font-semibold text-foreground">
          Session wrap-up
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Overall vibe and notes before you save.
        </p>
      </div>
      <div className={cn(EXECUTE_PANEL_BODY, 'space-y-5')}>
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Overall session</Label>
          <div className="flex justify-center gap-4 sm:gap-6">
            {(
              [
                { k: 'happy' as const, Icon: Smile, label: 'Great' },
                { k: 'meh' as const, Icon: Meh, label: 'OK' },
                { k: 'sad' as const, Icon: Frown, label: 'Tough' },
              ] as const
            ).map(({ k, Icon, label }) => (
              <Button
                key={k}
                type="button"
                variant={workoutRating === k ? 'default' : 'outline'}
                onClick={() => onRatingChange(k)}
                aria-label={`Rate session ${label.toLowerCase()}`}
                className={cn(
                  'h-[4.5rem] w-[4.5rem] touch-manipulation flex-col gap-1 rounded-xl p-0 sm:h-20 sm:w-20',
                  workoutRating === k && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <Icon className="h-8 w-8 sm:h-9 sm:w-9" aria-hidden />
                <span className="text-xs font-medium">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="trainer-observations" className="text-sm font-semibold">
            Coach notes
          </Label>
          <Textarea
            id="trainer-observations"
            value={trainerObservations}
            onChange={(e) => onObservationsChange(e.target.value)}
            placeholder="What to adjust next time…"
            rows={2}
            className="min-h-[80px] text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="session-notes" className="text-sm font-semibold">
            Client / session notes
          </Label>
          <Textarea
            id="session-notes"
            value={sessionNotes}
            onChange={(e) => onSessionNotesChange(e.target.value)}
            placeholder="Optional extra detail…"
            rows={2}
            className="min-h-[72px] text-base"
          />
        </div>
      </div>
    </section>
  );
}
