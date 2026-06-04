'use client';

import { ArrowDown, Layers, Link2, Repeat } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  formatGroupRoundsPrescription,
  groupTypeLabel,
  type ExerciseGroupType,
} from '@/lib/exercise-groups';
import { cn } from '@/lib/utils';

/** @deprecated Use EDIT_EXERCISES_LIST on the edit page */
export const WORKOUT_SEGMENT_LIST_CLASS = 'flex flex-col gap-6 sm:gap-8';

export const GROUP_BLOCK_SHELL_CLASS =
  'overflow-hidden rounded-xl border-2 border-primary/30 bg-primary/[0.06] shadow-sm';

export const STANDALONE_BLOCK_SHELL_CLASS =
  'overflow-hidden rounded-xl border border-border bg-card shadow-sm';

export function groupTypeIcon(type: ExerciseGroupType) {
  switch (type) {
    case 'circuit':
      return Layers;
    case 'triset':
      return Repeat;
    default:
      return Link2;
  }
}

export function GroupThenConnector() {
  return (
    <div
      className="flex items-center justify-center gap-2 bg-muted/20 py-2"
      aria-hidden
    >
      <span className="h-px flex-1 bg-border" />
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        <ArrowDown className="h-3 w-3 shrink-0" aria-hidden />
        Then
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

interface GroupBlockHeaderProps {
  blockLetter: string;
  groupType: ExerciseGroupType;
  movementNames: string[];
  restHint: string | null;
  groupRounds?: number;
  trailingAction?: ReactNode;
  completed?: boolean;
}

export function GroupBlockHeader({
  blockLetter,
  groupType,
  movementNames,
  restHint,
  groupRounds,
  trailingAction,
  completed,
}: GroupBlockHeaderProps) {
  const Icon = groupTypeIcon(groupType);
  const label = groupTypeLabel(groupType);
  const flowPreview = movementNames.filter(Boolean).join(' → ');
  const roundsSummary = formatGroupRoundsPrescription(
    groupRounds,
    groupType,
    movementNames.length
  );

  return (
    <header className="border-b border-primary/20 bg-primary/[0.1] px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground"
            aria-hidden
          >
            {blockLetter}
          </span>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <h3 className="text-base font-semibold leading-tight text-foreground">
                {label}
              </h3>
              <Badge
                variant="outline"
                className="border-primary/25 bg-background/80 text-xs font-normal"
              >
                {movementNames.length} movements
              </Badge>
              {completed ? (
                <Badge className="bg-success/15 text-xs text-success">
                  Logged
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {roundsSummary ?? 'Set how many times to run this full block below.'}
            </p>
          </div>
        </div>
        {trailingAction ? (
          <div className="shrink-0 sm:pt-0.5">{trailingAction}</div>
        ) : null}
      </div>
      {flowPreview ? (
        <p
          className="mt-3 truncate rounded-md border border-border/70 bg-background/90 px-3 py-2 font-mono text-xs text-foreground"
          title={flowPreview}
        >
          {flowPreview}
        </p>
      ) : null}
      {restHint ? (
        <p className="mt-2 text-xs font-medium text-foreground">{restHint}</p>
      ) : null}
    </header>
  );
}

interface StandaloneBlockHeaderProps {
  movementNumber: number;
  exerciseName?: string;
}

export function StandaloneBlockHeader({
  movementNumber,
  exerciseName,
}: StandaloneBlockHeaderProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-3 sm:px-6">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-bold text-foreground"
        aria-hidden
      >
        {movementNumber}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Single movement</p>
        <p className="truncate text-xs text-muted-foreground">
          {exerciseName?.trim() || 'Not linked to other exercises'}
        </p>
      </div>
    </div>
  );
}

interface GroupStepBadgeProps {
  label: string;
  className?: string;
}

export function GroupStepBadge({ label, className }: GroupStepBadgeProps) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary/35 bg-primary/12 font-mono text-xs font-bold text-foreground',
        className
      )}
    >
      {label}
    </span>
  );
}

export function GroupRestFooter({ restHint }: { restHint: string | null }) {
  if (!restHint) return null;
  return (
    <p className="text-center text-xs text-muted-foreground">{restHint}</p>
  );
}
