'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CoachNotesCollapsibleProps {
  value: string;
  onChange: (value: string) => void;
}

export function CoachNotesCollapsible({
  value,
  onChange,
}: CoachNotesCollapsibleProps) {
  const [open, setOpen] = useState(Boolean(value.trim()));

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-11 gap-1 px-0 text-muted-foreground hover:text-foreground sm:h-8"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              open && 'rotate-180'
            )}
            aria-hidden
          />
          Optional coach notes
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        <Label htmlFor="workout-reasoning">Coach notes</Label>
        <Textarea
          id="workout-reasoning"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Notes for yourself about this session (optional)"
          rows={3}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
