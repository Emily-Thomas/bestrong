'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export interface PreWorkoutSurveyResponse {
  recovery: 'fully_recovered' | 'mostly_recovered' | 'still_sore' | 'very_sore';
  rest: 'well_rested' | 'adequate_rest' | 'tired' | 'very_tired';
  mood: 'excited' | 'ready' | 'neutral' | 'not_feeling_it';
  injuries: 'none' | 'minor' | 'significant';
  injuryDetails?: string;
  notes?: string;
}

interface PreWorkoutSurveyProps {
  open: boolean;
  onComplete: (responses: PreWorkoutSurveyResponse) => void;
  clientName?: string;
}

export function PreWorkoutSurvey({
  open,
  onComplete,
  clientName,
}: PreWorkoutSurveyProps) {
  const [recovery, setRecovery] = useState<PreWorkoutSurveyResponse['recovery'] | ''>('');
  const [rest, setRest] = useState<PreWorkoutSurveyResponse['rest'] | ''>('');
  const [mood, setMood] = useState<PreWorkoutSurveyResponse['mood'] | ''>('');
  const [injuries, setInjuries] = useState<PreWorkoutSurveyResponse['injuries'] | ''>('');
  const [injuryDetails, setInjuryDetails] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!recovery || !rest || !mood || !injuries) {
      return;
    }

    const responses: PreWorkoutSurveyResponse = {
      recovery: recovery as PreWorkoutSurveyResponse['recovery'],
      rest: rest as PreWorkoutSurveyResponse['rest'],
      mood: mood as PreWorkoutSurveyResponse['mood'],
      injuries: injuries as PreWorkoutSurveyResponse['injuries'],
      injuryDetails: injuryDetails.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onComplete(responses);
  };

  const isComplete = recovery && rest && mood && injuries;
  const hasConcerns = 
    recovery === 'still_sore' || 
    recovery === 'very_sore' ||
    rest === 'tired' ||
    rest === 'very_tired' ||
    mood === 'not_feeling_it' ||
    injuries === 'minor' ||
    injuries === 'significant';

  return (
    <Dialog open={open} onOpenChange={() => {}} modal={true}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Pre-Workout Check-In</DialogTitle>
          <DialogDescription>
            {clientName ? `Quick assessment for ${clientName}` : 'Quick assessment before starting the workout'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recovery Question */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              How recovered is the client from the previous workout?
            </Label>
            <RadioGroup value={recovery} onValueChange={(value) => setRecovery(value as PreWorkoutSurveyResponse['recovery'])}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fully_recovered" id="recovery-1" />
                <Label htmlFor="recovery-1" className="font-normal cursor-pointer">
                  Fully recovered
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mostly_recovered" id="recovery-2" />
                <Label htmlFor="recovery-2" className="font-normal cursor-pointer">
                  Mostly recovered
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="still_sore" id="recovery-3" />
                <Label htmlFor="recovery-3" className="font-normal cursor-pointer">
                  Still sore
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="very_sore" id="recovery-4" />
                <Label htmlFor="recovery-4" className="font-normal cursor-pointer">
                  Very sore
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Rest Question */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              How well rested is the client?
            </Label>
            <RadioGroup value={rest} onValueChange={(value) => setRest(value as PreWorkoutSurveyResponse['rest'])}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="well_rested" id="rest-1" />
                <Label htmlFor="rest-1" className="font-normal cursor-pointer">
                  Well rested
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adequate_rest" id="rest-2" />
                <Label htmlFor="rest-2" className="font-normal cursor-pointer">
                  Adequate rest
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tired" id="rest-3" />
                <Label htmlFor="rest-3" className="font-normal cursor-pointer">
                  Tired
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="very_tired" id="rest-4" />
                <Label htmlFor="rest-4" className="font-normal cursor-pointer">
                  Very tired
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Mood Question */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              How is the client feeling about the workout today?
            </Label>
            <RadioGroup value={mood} onValueChange={(value) => setMood(value as PreWorkoutSurveyResponse['mood'])}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excited" id="mood-1" />
                <Label htmlFor="mood-1" className="font-normal cursor-pointer">
                  Excited and ready
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ready" id="mood-2" />
                <Label htmlFor="mood-2" className="font-normal cursor-pointer">
                  Ready to go
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="neutral" id="mood-3" />
                <Label htmlFor="mood-3" className="font-normal cursor-pointer">
                  Neutral
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not_feeling_it" id="mood-4" />
                <Label htmlFor="mood-4" className="font-normal cursor-pointer">
                  Not feeling it
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Injuries Question */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Any new injuries or pain?
            </Label>
            <RadioGroup value={injuries} onValueChange={(value) => setInjuries(value as PreWorkoutSurveyResponse['injuries'])}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="injuries-1" />
                <Label htmlFor="injuries-1" className="font-normal cursor-pointer">
                  None
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="minor" id="injuries-2" />
                <Label htmlFor="injuries-2" className="font-normal cursor-pointer">
                  Minor issue
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="significant" id="injuries-3" />
                <Label htmlFor="injuries-3" className="font-normal cursor-pointer">
                  Significant concern
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Injury Details */}
          {(injuries === 'minor' || injuries === 'significant') && (
            <div className="space-y-2">
              <Label htmlFor="injury-details" className="text-base font-semibold">
                Please describe the injury or pain
              </Label>
              <Textarea
                id="injury-details"
                value={injuryDetails}
                onChange={(e) => setInjuryDetails(e.target.value)}
                placeholder="Describe the injury, location, severity..."
                rows={3}
                className="text-base"
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-semibold">
              Additional notes (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other observations or concerns..."
              rows={2}
              className="text-base"
            />
          </div>

          {/* Warning Alert if concerns */}
          {hasConcerns && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Consider modifying the workout:</strong> The client may need adjustments based on their current state. Review the responses and consider reducing intensity, volume, or changing exercises.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!isComplete}
              size="lg"
              className="h-12 px-8 text-lg"
            >
              Continue to Workout
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
