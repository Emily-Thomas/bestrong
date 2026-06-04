'use client';

import { useEffect, useRef } from 'react';
import { APP_SHELL_SIDEBAR_OFFSET_CLASS } from '@/lib/app-shell-layout';
import { cn } from '@/lib/utils';

interface WorkoutEditStickyFooterProps {
  children: React.ReactNode;
  onHeightChange: (heightPx: number) => void;
}

export function WorkoutEditStickyFooter({
  children,
  onHeightChange,
}: WorkoutEditStickyFooterProps) {
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
        'fixed bottom-0 left-0 right-0 z-40 border-t bg-background shadow-lg',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        APP_SHELL_SIDEBAR_OFFSET_CLASS
      )}
    >
      {children}
    </div>
  );
}
