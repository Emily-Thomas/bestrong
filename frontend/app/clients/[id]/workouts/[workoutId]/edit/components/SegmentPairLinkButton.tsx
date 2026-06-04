'use client';

import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { touchActionClass } from '@/lib/touch-targets';

interface SegmentPairLinkButtonProps {
  topName: string;
  bottomName: string;
  onLink: () => void;
  previewActive?: boolean;
  previewLabel?: string;
}

export function SegmentPairLinkButton({
  topName,
  bottomName,
  onLink,
  previewActive = false,
  previewLabel,
}: SegmentPairLinkButtonProps) {
  const a = topName.trim() || 'Movement above';
  const b = bottomName.trim() || 'Movement below';

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 py-2 transition-colors motion-reduce:transition-none',
        previewActive &&
          'rounded-xl border border-primary/50 bg-primary/10 px-3 py-3 shadow-md'
      )}
      aria-label={`Link ${a} with ${b}`}
    >
      {previewActive && previewLabel ? (
        <p className="text-center text-xs font-medium text-foreground">
          {previewLabel} when you drop
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn(
          'h-8 max-w-full gap-1.5 rounded-full border-dashed px-3 text-xs shadow-sm hover:bg-primary/10',
          previewActive
            ? 'border-primary bg-primary/15 text-foreground'
            : 'border-primary/40 bg-background',
          touchActionClass
        )}
        onClick={onLink}
      >
        <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        Link pair
      </Button>
      <p className="max-w-lg truncate px-4 text-center text-[11px] text-muted-foreground">
        {a} · {b}
      </p>
    </div>
  );
}
