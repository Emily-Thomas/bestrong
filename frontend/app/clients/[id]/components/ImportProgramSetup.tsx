'use client';

import { Dumbbell, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clientsApi } from '@/lib/api';
import { importedProgramClientUrl } from '@/lib/client-onboarding';

interface ImportProgramSetupProps {
  clientId: number;
  clientName: string;
  onComplete: () => void | Promise<void>;
}

export function ImportProgramSetup({
  clientId,
  clientName,
  onComplete,
}: ImportProgramSetupProps) {
  const router = useRouter();
  const [phaseWeeks, setPhaseWeeks] = useState(4);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [sessionLength, setSessionLength] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await clientsApi.bootstrapImportedProgram(clientId, {
      phase_weeks: phaseWeeks,
      sessions_per_week: sessionsPerWeek,
      session_length_minutes: sessionLength,
    });

    if (res.success && res.data) {
      await onComplete();
      router.replace(importedProgramClientUrl(clientId), { scroll: false });
    } else {
      setError(
        res.error ||
          'We could not scaffold the program. Check the values and try again.'
      );
    }
    setSubmitting(false);
  };

  return (
    <Card
      id="import-program-setup"
      className="border-primary/30 bg-primary/[0.03] shadow-sm"
    >
      <CardHeader className="space-y-2">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
            aria-hidden
          >
            <Dumbbell className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">Build their program</CardTitle>
            <CardDescription>
              {clientName} is on the imported-program path: no questionnaire, no
              InBody, no AI plan. Tell Scout how many weeks and sessions you
              need, then add exercises session by session.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="import-phase-weeks">Weeks in block</Label>
              <Input
                id="import-phase-weeks"
                type="number"
                min={1}
                max={12}
                required
                value={phaseWeeks}
                onChange={(e) =>
                  setPhaseWeeks(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
              />
              <p className="text-xs text-muted-foreground">Usually 3–6 weeks</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-spw">Sessions per week</Label>
              <Input
                id="import-spw"
                type="number"
                min={1}
                max={6}
                required
                value={sessionsPerWeek}
                onChange={(e) =>
                  setSessionsPerWeek(
                    Math.min(6, Math.max(1, parseInt(e.target.value, 10) || 1))
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-length">Typical session (min)</Label>
              <Input
                id="import-length"
                type="number"
                min={15}
                max={180}
                required
                value={sessionLength}
                onChange={(e) =>
                  setSessionLength(
                    Math.min(
                      180,
                      Math.max(15, parseInt(e.target.value, 10) || 15)
                    )
                  )
                }
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Scout will create {phaseWeeks * sessionsPerWeek} empty sessions (
            {phaseWeeks} weeks × {sessionsPerWeek} per week). You will open the
            program builder to fill each cell or copy weeks once week 1 is done.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="submit" disabled={submitting} className="sm:min-w-[12rem]">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating sessions…
                </>
              ) : (
                'Create sessions and open builder'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
