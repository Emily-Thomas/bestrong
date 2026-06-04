'use client';

import { ChevronDown, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Exercise } from '@/lib/api';
import { cn } from '@/lib/utils';
import { touchActionClass } from '@/lib/touch-targets';
import {
  applyExerciseLinkAction,
  getExerciseLinkOptions,
  type ExerciseLinkAction,
} from '../lib/exercise-link-actions';

interface ExerciseLinkMenuProps {
  exercises: Exercise[];
  index: number;
  onLink: (nextExercises: Exercise[]) => void;
  className?: string;
}

export function ExerciseLinkMenu({
  exercises,
  index,
  onLink,
  className,
}: ExerciseLinkMenuProps) {
  const options = getExerciseLinkOptions(exercises, index);
  if (options.length === 0) return null;

  const handle = (action: ExerciseLinkAction) => {
    onLink(applyExerciseLinkAction(exercises, index, action));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn('h-9 shrink-0 gap-1.5', touchActionClass, className)}
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Link with…</span>
          <span className="sm:hidden">Link</span>
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Choose what to link
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.action.type}
            className="flex flex-col items-start gap-0.5 py-2"
            onSelect={() => handle(opt.action)}
          >
            <span className="font-medium">{opt.label}</span>
            {opt.detail ? (
              <span className="text-xs text-muted-foreground">{opt.detail}</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
