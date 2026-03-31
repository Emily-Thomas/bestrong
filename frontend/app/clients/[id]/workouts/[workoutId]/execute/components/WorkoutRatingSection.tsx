'use client';

import { Frown, Meh, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface WorkoutRatingSectionProps {
  variant?: 'default' | 'compact';
  workoutRating?: 'happy' | 'meh' | 'sad';
  trainerObservations: string;
  sessionNotes: string;
  onRatingChange: (rating: 'happy' | 'meh' | 'sad') => void;
  onObservationsChange: (observations: string) => void;
  onSessionNotesChange: (notes: string) => void;
}

export function WorkoutRatingSection({
  variant = 'default',
  workoutRating,
  trainerObservations,
  sessionNotes,
  onRatingChange,
  onObservationsChange,
  onSessionNotesChange,
}: WorkoutRatingSectionProps) {
  const compact = variant === 'compact';

  return (
    <Card className={cn('w-full', compact && 'rounded-2xl border-border/80')}>
      <CardHeader className={cn(compact && 'pb-2 pt-4')}>
        <CardTitle className={cn(compact ? 'text-lg font-bold' : 'text-2xl')}>
          Session wrap-up
        </CardTitle>
        {!compact && (
          <p className="text-sm text-muted-foreground">
            Overall vibe and quick notes before you save.
          </p>
        )}
      </CardHeader>
      <CardContent className={cn('space-y-5', compact && 'space-y-4 pb-4')}>
        <div className="space-y-3">
          <Label
            className={cn('font-semibold', compact ? 'text-sm' : 'text-lg')}
          >
            Overall session
          </Label>
          <div
            className={cn(
              'flex justify-center gap-4',
              compact ? 'py-1' : 'gap-6 py-4'
            )}
          >
            <Button
              type="button"
              variant={workoutRating === 'happy' ? 'default' : 'outline'}
              size="lg"
              onClick={() => onRatingChange('happy')}
              className={cn(
                'touch-manipulation flex-col gap-0.5 rounded-2xl p-0',
                compact ? 'h-[4.5rem] w-[4.5rem]' : 'h-20 w-20 rounded-full'
              )}
            >
              <Smile
                className={cn(compact ? 'h-9 w-9' : 'h-10 w-10', 'mb-0.5')}
              />
              <span className="text-[10px] font-medium">Great</span>
            </Button>
            <Button
              type="button"
              variant={workoutRating === 'meh' ? 'default' : 'outline'}
              size="lg"
              onClick={() => onRatingChange('meh')}
              className={cn(
                'touch-manipulation flex-col gap-0.5 rounded-2xl p-0',
                compact ? 'h-[4.5rem] w-[4.5rem]' : 'h-20 w-20 rounded-full'
              )}
            >
              <Meh
                className={cn(compact ? 'h-9 w-9' : 'h-10 w-10', 'mb-0.5')}
              />
              <span className="text-[10px] font-medium">OK</span>
            </Button>
            <Button
              type="button"
              variant={workoutRating === 'sad' ? 'default' : 'outline'}
              size="lg"
              onClick={() => onRatingChange('sad')}
              className={cn(
                'touch-manipulation flex-col gap-0.5 rounded-2xl p-0',
                compact ? 'h-[4.5rem] w-[4.5rem]' : 'h-20 w-20 rounded-full'
              )}
            >
              <Frown
                className={cn(compact ? 'h-9 w-9' : 'h-10 w-10', 'mb-0.5')}
              />
              <span className="text-[10px] font-medium">Tough</span>
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label
            htmlFor="trainer-observations"
            className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}
          >
            Coach notes
          </Label>
          <Textarea
            id="trainer-observations"
            value={trainerObservations}
            onChange={(e) => onObservationsChange(e.target.value)}
            placeholder="What to adjust next time…"
            rows={compact ? 2 : 4}
            className="min-h-[80px] text-base"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="session-notes"
            className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}
          >
            Client / session notes
          </Label>
          <Textarea
            id="session-notes"
            value={sessionNotes}
            onChange={(e) => onSessionNotesChange(e.target.value)}
            placeholder="Optional extra detail…"
            rows={compact ? 2 : 3}
            className="min-h-[72px] text-base"
          />
        </div>
      </CardContent>
    </Card>
  );
}
