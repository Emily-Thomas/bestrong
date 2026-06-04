'use client';

import { Link2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { touchActionClass } from '@/lib/touch-targets';
import { EDIT_LINK_TOOLBAR_WRAP } from '../lib/edit-ui-classes';
import {
  areConsecutiveIndices,
  linkLabelForSelectionCount,
} from '../lib/exercise-link-actions';

interface LinkSelectionToolbarProps {
  selectedIndices: number[];
  onLinkSelected: () => void;
  onClear: () => void;
}

export function LinkSelectionToolbar({
  selectedIndices,
  onLinkSelected,
  onClear,
}: LinkSelectionToolbarProps) {
  if (selectedIndices.length === 0) return null;

  const consecutive = areConsecutiveIndices(selectedIndices);
  const count = selectedIndices.length;

  return (
    <div
      className={EDIT_LINK_TOOLBAR_WRAP}
    >
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {count} movement{count === 1 ? '' : 's'} selected
        </p>
        <p className="mt-0.5 text-xs text-pretty text-muted-foreground">
          {consecutive && count >= 2
            ? 'Ready to link in list order.'
            : 'Choose movements next to each other in the list.'}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {consecutive && count >= 2 ? (
          <Button
            type="button"
            size="sm"
            className={cn('gap-1.5', touchActionClass)}
            onClick={onLinkSelected}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            {linkLabelForSelectionCount(count)}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn('gap-1', touchActionClass)}
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Clear
        </Button>
      </div>
      </div>
    </div>
  );
}
