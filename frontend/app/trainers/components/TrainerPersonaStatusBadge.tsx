import { AlertTriangle, CircleCheck, CircleDashed } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  type TrainerPersonaStatus,
  trainerPersonaStatusLabel,
} from '../lib/trainer-utils';

type TrainerPersonaStatusBadgeProps = {
  status: TrainerPersonaStatus;
  className?: string;
  /** Shorter label for dense table cells; full label exposed to assistive tech. */
  compact?: boolean;
};

export function TrainerPersonaStatusBadge({
  status,
  className,
  compact = false,
}: TrainerPersonaStatusBadgeProps) {
  const label = trainerPersonaStatusLabel(status, compact);
  const fullLabel = trainerPersonaStatusLabel(status, false);

  const assistiveLabel =
    compact && label !== fullLabel ? fullLabel : undefined;

  if (status === 'stale') {
    return (
      <Badge
        variant="outline"
        title={assistiveLabel}
        aria-label={assistiveLabel}
        className={
          className ??
          'gap-1 border-amber-500/40 text-amber-900 dark:text-amber-200'
        }
      >
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
        {label}
      </Badge>
    );
  }

  if (status === 'ready') {
    return (
      <Badge
        variant="secondary"
        title={assistiveLabel}
        aria-label={assistiveLabel}
        className={
          className ??
          'gap-1 border-0 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200'
        }
      >
        <CircleCheck className="h-3 w-3 shrink-0" aria-hidden />
        {label}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      title={assistiveLabel}
      aria-label={assistiveLabel}
      className={cn('gap-1', className)}
    >
      <CircleDashed className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </Badge>
  );
}
