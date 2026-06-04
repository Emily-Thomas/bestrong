'use client';

import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { touchActionClass } from '@/lib/touch-targets';

interface ExerciseDragHandleProps {
  label: string;
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  className?: string;
}

export function ExerciseDragHandle({
  label,
  attributes,
  listeners,
  className,
}: ExerciseDragHandleProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors',
        'hover:bg-muted hover:text-foreground active:cursor-grabbing',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'touch-none',
        touchActionClass,
        className
      )}
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  );
}
