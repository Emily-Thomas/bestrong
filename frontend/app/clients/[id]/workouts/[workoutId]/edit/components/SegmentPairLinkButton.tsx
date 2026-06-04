'use client';

import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { touchActionClass } from '@/lib/touch-targets';

interface SegmentPairLinkButtonProps {
  topName: string;
  bottomName: string;
  onLink: () => void;
}

export function SegmentPairLinkButton({
  topName,
  bottomName,
  onLink,
}: SegmentPairLinkButtonProps) {
  const a = topName.trim() || 'Movement above';
  const b = bottomName.trim() || 'Movement below';

  return (
    <li className="list-none" aria-label={`Link ${a} with ${b}`}>
      <div className="flex flex-col items-center gap-2 py-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            'h-8 max-w-full gap-1.5 rounded-full border-dashed border-primary/40 bg-background px-3 text-xs shadow-sm hover:bg-primary/10',
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
    </li>
  );
}
