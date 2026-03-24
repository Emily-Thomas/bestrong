'use client';

import { Frown, Meh, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Overall Workout Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Rating */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold">
            How did the overall workout go?
          </Label>
          <div className="flex gap-6 justify-center py-4">
            <Button
              type="button"
              variant={workoutRating === 'happy' ? 'default' : 'outline'}
              size="lg"
              onClick={() => onRatingChange('happy')}
              className="h-20 w-20 rounded-full p-0 flex flex-col items-center justify-center"
            >
              <Smile className="h-10 w-10 mb-1" />
              <span className="text-xs mt-1">Great</span>
            </Button>
            <Button
              type="button"
              variant={workoutRating === 'meh' ? 'default' : 'outline'}
              size="lg"
              onClick={() => onRatingChange('meh')}
              className="h-20 w-20 rounded-full p-0 flex flex-col items-center justify-center"
            >
              <Meh className="h-10 w-10 mb-1" />
              <span className="text-xs mt-1">Okay</span>
            </Button>
            <Button
              type="button"
              variant={workoutRating === 'sad' ? 'default' : 'outline'}
              size="lg"
              onClick={() => onRatingChange('sad')}
              className="h-20 w-20 rounded-full p-0 flex flex-col items-center justify-center"
            >
              <Frown className="h-10 w-10 mb-1" />
              <span className="text-xs mt-1">Poor</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Trainer Observations */}
        <div className="space-y-2">
          <Label
            htmlFor="trainer-observations"
            className="text-base font-semibold"
          >
            What went right or wrong?
          </Label>
          <Textarea
            id="trainer-observations"
            value={trainerObservations}
            onChange={(e) => onObservationsChange(e.target.value)}
            placeholder="Optional: Add notes about what went well or what needs improvement..."
            rows={4}
            className="text-base"
          />
        </div>

        {/* Session Notes */}
        <div className="space-y-2">
          <Label htmlFor="session-notes" className="text-base font-semibold">
            Additional Session Notes
          </Label>
          <Textarea
            id="session-notes"
            value={sessionNotes}
            onChange={(e) => onSessionNotesChange(e.target.value)}
            placeholder="Optional: Add any additional notes about the session..."
            rows={3}
            className="text-base"
          />
        </div>
      </CardContent>
    </Card>
  );
}
