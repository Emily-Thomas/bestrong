'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
  ManualPlanStartPayload,
  PlanGuidanceWeeklyDay,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const DAY_PRESETS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function defaultWeeklyRows(spw: number): PlanGuidanceWeeklyDay[] {
  const step = Math.max(1, Math.min(3, Math.floor(7 / Math.max(spw, 1))));
  return Array.from({ length: spw }, (_, i) => ({
    day: DAY_PRESETS[Math.min(i * step, 6)],
    session_label: `Session ${i + 1}`,
    focus_theme: '',
  }));
}

const LOAD_PRESETS: { label: string; value: string }[] = [
  {
    label: 'Custom (use field below)',
    value: '__custom__',
  },
  {
    label: 'Hold steady — same RPE / load targets week to week',
    value:
      'Keep loads and effort stable across weeks unless recovery is excellent; focus on movement quality.',
  },
  {
    label: 'Small weekly bump — ~5% load or +1 rep when form is crisp',
    value:
      'When sets look clean with 1–3 RIR, add a small amount of load or one rep on main lifts; accessories follow feel.',
  },
  {
    label: 'Double progression on accessories — add reps then load',
    value:
      'Main lifts: small weekly load bumps when bar speed is consistent. Accessories: add reps within range before increasing load.',
  },
];

export interface ManualMesocycleFormProps {
  questionnaireId: number;
  trainerId: number | null;
  coachRequired: boolean;
  disabled?: boolean;
  onSubmit: (payload: ManualPlanStartPayload) => Promise<void>;
  className?: string;
}

export function ManualMesocycleForm({
  questionnaireId,
  trainerId,
  coachRequired,
  disabled = false,
  onSubmit,
  className,
}: ManualMesocycleFormProps) {
  const [clientType, setClientType] = useState('');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [sessionLength, setSessionLength] = useState(45);
  const [phaseWeeks, setPhaseWeeks] = useState(3);
  const [trainingStyle, setTrainingStyle] = useState('');
  const [trainingMethodsText, setTrainingMethodsText] = useState(
    'Compound strength\nAccessory work\nCore'
  );
  const [archetype, setArchetype] = useState('Custom mesocycle');
  const [description, setDescription] = useState('');
  const [weeklyRows, setWeeklyRows] = useState<PlanGuidanceWeeklyDay[]>(() =>
    defaultWeeklyRows(3)
  );
  const [progressionGuidelines, setProgressionGuidelines] = useState(
    'Add load or reps only when form and recovery stay solid; repeat a week if needed.'
  );
  const [loadPreset, setLoadPreset] = useState('__custom__');
  const [intensityLoadProgression, setIntensityLoadProgression] = useState(
    'RPE 7–8 on compounds; 2–3 RIR. Small weekly load increases when bar speed is consistent.'
  );
  const [periodization, setPeriodization] = useState('');
  const [aiReasoning, setAiReasoning] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setWeeklyRows((prev) => {
      if (prev.length === sessionsPerWeek) return prev;
      if (prev.length < sessionsPerWeek) {
        const extra = defaultWeeklyRows(sessionsPerWeek).slice(prev.length);
        return [...prev, ...extra];
      }
      return prev.slice(0, sessionsPerWeek);
    });
  }, [sessionsPerWeek]);

  const updateRow = useCallback(
    (index: number, patch: Partial<PlanGuidanceWeeklyDay>) => {
      setWeeklyRows((rows) =>
        rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
      );
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (coachRequired && trainerId == null) {
      setLocalError('Select a coach in step 1 before saving this mesocycle.');
      return;
    }
    const methods = trainingMethodsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!clientType.trim()) {
      setLocalError('Enter a mesocycle label (client type).');
      return;
    }
    if (!trainingStyle.trim()) {
      setLocalError('Enter a training style summary.');
      return;
    }
    if (!archetype.trim() || !description.trim()) {
      setLocalError('Enter archetype and phase description.');
      return;
    }
    if (weeklyRows.some((r) => !r.day.trim() || !r.session_label.trim())) {
      setLocalError('Each session needs a day and label.');
      return;
    }

    const plan_structure = {
      archetype: archetype.trim(),
      description: description.trim(),
      phase_1_weeks: phaseWeeks,
      training_methods: methods.length ? methods : ['General strength'],
      weekly_repeating_schedule: weeklyRows.map((r) => ({
        day: r.day.trim(),
        session_label: r.session_label.trim(),
        focus_theme: r.focus_theme.trim() || 'See session label',
      })),
      progression_guidelines: progressionGuidelines.trim(),
      intensity_load_progression:
        loadPreset === '__custom__'
          ? intensityLoadProgression.trim()
          : loadPreset,
      ...(periodization.trim()
        ? { periodization_approach: periodization.trim() }
        : {}),
    };

    const payload: ManualPlanStartPayload = {
      questionnaire_id: questionnaireId,
      ...(trainerId != null ? { trainer_id: trainerId } : {}),
      client_type: clientType.trim(),
      sessions_per_week: sessionsPerWeek,
      session_length_minutes: sessionLength,
      training_style: trainingStyle.trim(),
      plan_structure,
      ...(aiReasoning.trim() ? { ai_reasoning: aiReasoning.trim() } : {}),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch {
      setLocalError('Could not start mesocycle job.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={cn(
        'space-y-5 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] via-background to-muted/15 p-5 shadow-sm dark:from-amber-500/12',
        className
      )}
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md dark:bg-amber-500">
          <span className="text-lg font-bold">M</span>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Build mesocycle manually
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Define frequency, phase length, session themes, and load progression.
            Generate workouts afterward from the Workouts tab when you&apos;re
            ready.
          </p>
        </div>
      </div>

      {localError && (
        <p className="text-sm text-destructive" role="alert">
          {localError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mm-client-type">Mesocycle label</Label>
          <Input
            id="mm-client-type"
            value={clientType}
            onChange={(e) => setClientType(e.target.value)}
            placeholder="e.g. Upper/Lower strength block"
            disabled={disabled || submitting}
          />
        </div>
        <div className="space-y-2">
          <Label>Sessions / week</Label>
          <Select
            value={String(sessionsPerWeek)}
            onValueChange={(v) => setSessionsPerWeek(parseInt(v, 10))}
            disabled={disabled || submitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}× / week
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Session length</Label>
          <Select
            value={String(sessionLength)}
            onValueChange={(v) => setSessionLength(parseInt(v, 10))}
            disabled={disabled || submitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[30, 45, 60, 75, 90].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mm-phase-weeks">Phase length (weeks)</Label>
          <Input
            id="mm-phase-weeks"
            type="number"
            min={1}
            max={12}
            value={phaseWeeks}
            onChange={(e) =>
              setPhaseWeeks(
                Math.min(12, Math.max(1, parseInt(e.target.value, 10) || 1))
              )
            }
            disabled={disabled || submitting}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mm-training-style">Training style</Label>
          <Textarea
            id="mm-training-style"
            value={trainingStyle}
            onChange={(e) => setTrainingStyle(e.target.value)}
            placeholder="How this phase should feel — intensity, split, priorities"
            rows={2}
            disabled={disabled || submitting}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mm-methods">Training methods (one per line)</Label>
          <Textarea
            id="mm-methods"
            value={trainingMethodsText}
            onChange={(e) => setTrainingMethodsText(e.target.value)}
            rows={3}
            disabled={disabled || submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mm-archetype">Archetype</Label>
          <Input
            id="mm-archetype"
            value={archetype}
            onChange={(e) => setArchetype(e.target.value)}
            disabled={disabled || submitting}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mm-desc">Phase description</Label>
          <Textarea
            id="mm-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            disabled={disabled || submitting}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Weekly session outline ({sessionsPerWeek} rows — must match frequency)
        </p>
        <div className="space-y-3">
          {weeklyRows.map((row, i) => (
            <div
              key={`${row.day}-${row.session_label}-${String(i)}`}
              className="grid gap-2 rounded-lg border border-border/60 bg-background/80 p-3 sm:grid-cols-3"
            >
              <div className="space-y-1">
                <Label className="text-xs">Day</Label>
                <Select
                  value={row.day}
                  onValueChange={(v) => updateRow(i, { day: v })}
                  disabled={disabled || submitting}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_PRESETS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Session label</Label>
                <Input
                  value={row.session_label}
                  onChange={(e) =>
                    updateRow(i, { session_label: e.target.value })
                  }
                  disabled={disabled || submitting}
                />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs">Focus / exercise themes</Label>
                <Input
                  value={row.focus_theme}
                  onChange={(e) =>
                    updateRow(i, { focus_theme: e.target.value })
                  }
                  placeholder="e.g. Squat, push, pull"
                  disabled={disabled || submitting}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mm-prog">Progression guidelines</Label>
          <Textarea
            id="mm-prog"
            value={progressionGuidelines}
            onChange={(e) => setProgressionGuidelines(e.target.value)}
            rows={2}
            disabled={disabled || submitting}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Load / RPE progression preset</Label>
          <Select
            value={loadPreset}
            onValueChange={(v) => {
              setLoadPreset(v);
              if (v !== '__custom__') {
                setIntensityLoadProgression(v);
              }
            }}
            disabled={disabled || submitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOAD_PRESETS.map((p) => (
                <SelectItem key={p.label} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {loadPreset === '__custom__' && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="mm-load">Intensity &amp; load progression</Label>
            <Textarea
              id="mm-load"
              value={intensityLoadProgression}
              onChange={(e) => setIntensityLoadProgression(e.target.value)}
              rows={2}
              disabled={disabled || submitting}
            />
          </div>
        )}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mm-peri">Periodization (optional)</Label>
          <Input
            id="mm-peri"
            value={periodization}
            onChange={(e) => setPeriodization(e.target.value)}
            placeholder="e.g. 3-week ramp, 1-week ease"
            disabled={disabled || submitting}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mm-notes">Notes for the record (optional)</Label>
          <Textarea
            id="mm-notes"
            value={aiReasoning}
            onChange={(e) => setAiReasoning(e.target.value)}
            rows={2}
            disabled={disabled || submitting}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={
          disabled ||
          submitting ||
          (coachRequired && trainerId == null) ||
          !clientType.trim()
        }
        className="w-full sm:w-auto"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting…
          </>
        ) : (
          'Save mesocycle'
        )}
      </Button>
    </form>
  );
}
