'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DRAG_SORTABLE_TRANSITION } from '../lib/edit-ui-classes';
import type { SegmentDragHandleProps } from './SortableSegmentShell';

interface SortableMovementRowProps {
  id: string;
  children: (drag: SegmentDragHandleProps) => ReactNode;
}

export function SortableMovementRow({ id, children }: SortableMovementRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type: 'movement' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? DRAG_SORTABLE_TRANSITION,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative bg-background',
        isDragging && 'z-10 opacity-60 shadow-md ring-1 ring-primary/25'
      )}
    >
      {children({ attributes, listeners })}
    </div>
  );
}
