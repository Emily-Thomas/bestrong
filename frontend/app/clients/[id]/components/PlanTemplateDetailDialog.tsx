'use client';

import { Calendar, Clock, Flame, Layers, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { type PlanTemplateDetail, recommendationsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

function formatGoalCategory(g: PlanTemplateDetail['goal_category']): string {
  return g.replace(/_/g, ' ');
}

interface PlanTemplateDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string | null;
}

export function PlanTemplateDetailDialog({
  open,
  onOpenChange,
  templateId,
}: PlanTemplateDetailDialogProps) {
  const [detail, setDetail] = useState<PlanTemplateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !templateId) {
      setDetail(null);
      setError('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      const res = await recommendationsApi.getPlanTemplateById(templateId);
      if (cancelled) return;
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        setError(res.error || 'Could not load template');
        setDetail(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, templateId]);

  const ps = detail?.plan_structure;
  const hasBlueprints = Boolean(detail?.session_blueprints?.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'grid max-h-[90vh] w-full max-w-2xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-2xl'
        )}
      >
        <DialogHeader className="shrink-0 px-6 pb-2 pt-6">
          <DialogTitle className="pr-8 text-xl leading-snug">
            {loading ? 'Loading…' : (detail?.name ?? 'Plan template')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full plan template: schedule, progression, and exercise blueprint
            when available.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pb-6">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading template…
            </div>
          ) : error ? (
            <p className="py-4 text-sm text-destructive">{error}</p>
          ) : detail ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {detail.experience_level}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {formatGoalCategory(detail.goal_category)}
                </Badge>
                {hasBlueprints ? (
                  <Badge className="border-primary/30 bg-primary/10 text-primary">
                    Exercise blueprint
                  </Badge>
                ) : null}
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {detail.summary}
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    Frequency
                  </div>
                  <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                    {detail.sessions_per_week}× / week
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-milo-info" />
                    Session
                  </div>
                  <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                    {detail.session_length_minutes} min
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Layers className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                    Phase
                  </div>
                  <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                    {detail.phase_1_weeks} wk block
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Flame className="h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-orange-400" />
                    Intensity
                  </div>
                  <p className="mt-1 text-sm font-bold leading-tight text-foreground">
                    {detail.intensity_label}
                  </p>
                </div>
              </div>

              <Separator />

              <section>
                <h3 className="text-sm font-semibold text-foreground">
                  Training approach
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {detail.training_style}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Client type:{' '}
                  </span>
                  {detail.client_type}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-primary/90">
                  {detail.mesocycle_type}
                </p>
              </section>

              {ps ? (
                <>
                  <section>
                    <h3 className="text-sm font-semibold text-foreground">
                      Archetype
                    </h3>
                    <p className="mt-1 text-sm font-medium">{ps.archetype}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {ps.description}
                    </p>
                  </section>
                  {ps.training_methods?.length ? (
                    <section>
                      <h3 className="text-sm font-semibold text-foreground">
                        Methods
                      </h3>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {ps.training_methods.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  <section>
                    <h3 className="text-sm font-semibold text-foreground">
                      Weekly schedule
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {ps.weekly_repeating_schedule.map((d) => (
                        <li
                          key={`${d.day}-${d.session_label}`}
                          className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-foreground">
                            {d.day} — {d.session_label}
                          </span>
                          <p className="mt-1 text-muted-foreground">
                            {d.focus_theme}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="space-y-3 text-sm">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Progression
                      </h3>
                      <p className="mt-1 text-muted-foreground">
                        {ps.progression_guidelines}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Intensity &amp; load
                      </h3>
                      <p className="mt-1 text-muted-foreground">
                        {ps.intensity_load_progression}
                      </p>
                    </div>
                    {ps.periodization_approach ? (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Periodization
                        </h3>
                        <p className="mt-1 text-muted-foreground">
                          {ps.periodization_approach}
                        </p>
                      </div>
                    ) : null}
                  </section>
                </>
              ) : null}

              {detail.template_progression &&
              (detail.template_progression.weekly_load_multiplier != null ||
                detail.template_progression.weekly_rpe_delta != null) ? (
                <>
                  <Separator />
                  <section>
                    <h3 className="text-sm font-semibold text-foreground">
                      Template progression (week to week)
                    </h3>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {detail.template_progression.weekly_load_multiplier !=
                      null ? (
                        <li>
                          Weekly load multiplier:{' '}
                          {detail.template_progression.weekly_load_multiplier}
                        </li>
                      ) : null}
                      {detail.template_progression.weekly_rpe_delta != null ? (
                        <li>
                          Weekly RPE delta:{' '}
                          {detail.template_progression.weekly_rpe_delta}
                        </li>
                      ) : null}
                    </ul>
                  </section>
                </>
              ) : null}

              {detail.session_blueprints?.length ? (
                <>
                  <Separator />
                  <section>
                    <h3 className="text-sm font-semibold text-foreground">
                      Exercise blueprint (per session)
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Names match your exercise library when possible; otherwise
                      they are stored as custom exercises.
                    </p>
                    <div className="mt-3 space-y-4">
                      {[...detail.session_blueprints]
                        .sort((a, b) => a.session_index - b.session_index)
                        .map((bp) => {
                          const scheduleLabel =
                            ps?.weekly_repeating_schedule[bp.session_index];
                          return (
                            <div
                              key={bp.session_index}
                              className="rounded-xl border border-border/70 bg-muted/20 p-3"
                            >
                              <p className="text-sm font-semibold text-foreground">
                                {scheduleLabel
                                  ? `${scheduleLabel.day} — ${scheduleLabel.session_label}`
                                  : `Session ${bp.session_index + 1}`}
                              </p>
                              {scheduleLabel ? (
                                <p className="text-xs text-muted-foreground">
                                  {scheduleLabel.focus_theme}
                                </p>
                              ) : null}
                              <ol className="mt-3 space-y-2">
                                {[...bp.exercises]
                                  .sort((a, b) => a.order - b.order)
                                  .map((ex, i) => (
                                    <li
                                      key={`${ex.order}-${ex.library_exercise_name}`}
                                      className="text-sm"
                                    >
                                      <span className="font-medium text-foreground">
                                        {i + 1}. {ex.library_exercise_name}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {' '}
                                        · {ex.sets != null ? `${ex.sets}×` : ''}{' '}
                                        {ex.reps ?? ''}
                                        {ex.load_prescription
                                          ? ` · ${ex.load_prescription}`
                                          : ''}
                                        {ex.rest_seconds != null
                                          ? ` · ${ex.rest_seconds}s rest`
                                          : ''}
                                        {ex.rir != null
                                          ? ` · ${ex.rir} RIR`
                                          : ''}
                                      </span>
                                      {ex.notes ? (
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                          {ex.notes}
                                        </p>
                                      ) : null}
                                    </li>
                                  ))}
                              </ol>
                            </div>
                          );
                        })}
                    </div>
                  </section>
                </>
              ) : null}

              {detail.ai_reasoning ? (
                <>
                  <Separator />
                  <section>
                    <h3 className="text-sm font-semibold text-foreground">
                      Template note
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {detail.ai_reasoning}
                    </p>
                  </section>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
