'use client';

import { useEffect, useRef } from 'react';
import { APP_SHELL_SIDEBAR_OFFSET_CLASS } from '@/lib/app-shell-layout';
import { cn } from '@/lib/utils';

interface WorkoutExecuteStickyFooterProps {
  children: React.ReactNode;
  onHeightChange: (heightPx: number) => void;
}

export function WorkoutExecuteStickyFooter({
  children,
  onHeightChange,
}: WorkoutExecuteStickyFooterProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const report = () => onHeightChange(node.offsetHeight);

    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <div
      ref={ref}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3',
        'shadow-[0_-4px_24px_-8px_hsl(240_10%_2%/0.45)]',
        APP_SHELL_SIDEBAR_OFFSET_CLASS
      )}
    >
      {children}
    </div>
  );
}
