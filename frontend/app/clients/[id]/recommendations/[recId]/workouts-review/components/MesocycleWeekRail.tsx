'use client';

import { CalendarRange, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface MesocycleWeekRailProps {
  weekNumbers: number[];
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
  /** Planned phase length from recommendation (e.g. 4 weeks); falls back to max week. */
  phaseWeeksPlanned: number;
  className?: string;
}

export function MesocycleWeekRail({
  weekNumbers,
  selectedWeek,
  onSelectWeek,
  phaseWeeksPlanned,
  className,
}: MesocycleWeekRailProps) {
  const maxWeek = weekNumbers.length ? Math.max(...weekNumbers) : 1;
  const span = Math.max(phaseWeeksPlanned, maxWeek, 1);
  const progressPct = Math.min(100, (maxWeek / span) * 100);

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.07] via-background to-violet-500/[0.06] p-4 shadow-sm dark:from-primary/10 dark:to-violet-950/20 sm:p-5',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-inner">
            <CalendarRange className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mesocycle map
            </p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {span} week block · jump between weeks to compare load and volume
            </p>
            <div className="mt-3 max-w-md">
              <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Progression arc</span>
                <span className="tabular-nums">
                  Week {maxWeek} of {span}
                </span>
              </div>
              <Progress value={progressPct} className="h-2 bg-muted/80" />
            </div>
          </div>
        </div>
      </div>

      <div
        className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Select week"
      >
        {weekNumbers.map((w) => {
          const active = w === selectedWeek;
          return (
            <Button
              key={w}
              type="button"
              role="tab"
              aria-selected={active}
              variant={active ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'shrink-0 rounded-full px-4 font-semibold shadow-sm transition-all',
                active &&
                  'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30'
              )}
              onClick={() => onSelectWeek(w)}
            >
              Week {w}
              {active ? (
                <ChevronRight className="ml-1 h-3.5 w-3.5 opacity-80" />
              ) : null}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
