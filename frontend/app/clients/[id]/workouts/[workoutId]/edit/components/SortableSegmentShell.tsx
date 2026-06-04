'use client';

import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DRAG_SORTABLE_TRANSITION } from '../lib/edit-ui-classes';

export type SegmentDragHandleProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

interface SortableSegmentShellProps {
  id: string;
  children: (drag: SegmentDragHandleProps) => ReactNode;
}

export function SortableSegmentShell({ id, children }: SortableSegmentShellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type: 'segment' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? DRAG_SORTABLE_TRANSITION,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'list-none motion-reduce:transition-none',
        isDragging && 'relative z-20 opacity-55'
      )}
    >
      {children({ attributes, listeners })}
    </li>
  );
}
