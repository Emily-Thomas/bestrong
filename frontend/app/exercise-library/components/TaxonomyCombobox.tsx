'use client';

import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { touchActionClass } from '@/lib/touch-targets';
import { cn } from '@/lib/utils';

interface TaxonomyComboboxProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  /** Allow adding a value not yet in the library */
  allowCreate?: boolean;
}

export function TaxonomyCombobox({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Pick a value',
  allowCreate = true,
}: TaxonomyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  const canCreate = useMemo(() => {
    if (!allowCreate || !trimmedQuery) return false;
    return !options.some((opt) => opt.toLowerCase() === normalizedQuery);
  }, [allowCreate, trimmedQuery, normalizedQuery, options]);

  const displayValue = value.trim() || placeholder;

  const selectValue = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              touchActionClass,
              !value.trim() && 'text-muted-foreground'
            )}
          >
            <span className="truncate">{displayValue}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter>
            <CommandInput
              placeholder={`Search ${label.toLowerCase()}…`}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty className="py-3 text-xs text-muted-foreground">
                {canCreate
                  ? 'No match. Add your new value below.'
                  : 'No matches. Pick from the list or clear search.'}
              </CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => selectValue(opt)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === opt ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {opt}
                  </CommandItem>
                ))}
                {canCreate ? (
                  <CommandItem
                    value={`__create__${trimmedQuery}`}
                    onSelect={() => selectValue(trimmedQuery)}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add &quot;{trimmedQuery}&quot;
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
