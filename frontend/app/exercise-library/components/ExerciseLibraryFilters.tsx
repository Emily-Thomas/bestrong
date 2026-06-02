'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { forwardRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { touchActionClass } from '@/lib/touch-targets';
import { cn } from '@/lib/utils';

interface ExerciseLibraryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  primaryFilter: string;
  equipmentFilter: string;
  categoryFilter: string;
  onPrimaryFilterChange: (value: string) => void;
  onEquipmentFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  showArchived: boolean;
  onShowArchivedChange: (checked: boolean) => void;
  primaryOptions: string[];
  equipmentOptions: string[];
  categoryOptions: string[];
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}

function FilterFields({
  primaryFilter,
  equipmentFilter,
  categoryFilter,
  onPrimaryFilterChange,
  onEquipmentFilterChange,
  onCategoryFilterChange,
  showArchived,
  onShowArchivedChange,
  primaryOptions,
  equipmentOptions,
  categoryOptions,
  className,
}: Omit<ExerciseLibraryFiltersProps, 'search' | 'onSearchChange'> & {
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Select value={primaryFilter} onValueChange={onPrimaryFilterChange}>
        <SelectTrigger className={cn('w-full', touchActionClass)}>
          <SelectValue placeholder="Primary muscle" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All muscles</SelectItem>
          {primaryOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={equipmentFilter} onValueChange={onEquipmentFilterChange}>
        <SelectTrigger className={cn('w-full', touchActionClass)}>
          <SelectValue placeholder="Equipment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All equipment</SelectItem>
          {equipmentOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
        <SelectTrigger className={cn('w-full', touchActionClass)}>
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categoryOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 border-t border-border/80 pt-3">
        <Checkbox
          id="show-archived"
          checked={showArchived}
          onCheckedChange={(checked) =>
            onShowArchivedChange(checked === true)
          }
        />
        <Label htmlFor="show-archived" className="text-sm font-normal">
          Show archived
        </Label>
      </div>
    </div>
  );
}

const FiltersTriggerButton = forwardRef<
  HTMLButtonElement,
  { activeFilterCount: number; className?: string }
>(function FiltersTriggerButton({ activeFilterCount, className, ...props }, ref) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      className={cn('h-10 shrink-0 gap-2', touchActionClass, className)}
      {...props}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      Filters
      {activeFilterCount > 0 ? (
        <Badge variant="secondary" className="ml-0.5 font-normal tabular-nums">
          {activeFilterCount}
        </Badge>
      ) : null}
    </Button>
  );
});

function ActiveFilterChips({
  primaryFilter,
  equipmentFilter,
  categoryFilter,
  showArchived,
  onPrimaryFilterChange,
  onEquipmentFilterChange,
  onCategoryFilterChange,
  onShowArchivedChange,
}: Pick<
  ExerciseLibraryFiltersProps,
  | 'primaryFilter'
  | 'equipmentFilter'
  | 'categoryFilter'
  | 'showArchived'
  | 'onPrimaryFilterChange'
  | 'onEquipmentFilterChange'
  | 'onCategoryFilterChange'
  | 'onShowArchivedChange'
>) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (primaryFilter !== 'all') {
    chips.push({
      key: 'muscle',
      label: primaryFilter,
      onRemove: () => onPrimaryFilterChange('all'),
    });
  }
  if (equipmentFilter !== 'all') {
    chips.push({
      key: 'equipment',
      label: equipmentFilter,
      onRemove: () => onEquipmentFilterChange('all'),
    });
  }
  if (categoryFilter !== 'all') {
    chips.push({
      key: 'category',
      label: categoryFilter,
      onRemove: () => onCategoryFilterChange('all'),
    });
  }
  if (showArchived) {
    chips.push({
      key: 'archived',
      label: 'Archived included',
      onRemove: () => onShowArchivedChange(false),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Active filters"
    >
      {chips.map((chip) => (
        <Button
          key={chip.key}
          type="button"
          variant="secondary"
          size="sm"
          className={cn('h-8 gap-1 rounded-full px-3 font-normal', touchActionClass)}
          onClick={chip.onRemove}
        >
          {chip.label}
          <X className="h-3.5 w-3.5 opacity-70" aria-hidden />
          <span className="sr-only">Remove {chip.label} filter</span>
        </Button>
      ))}
    </div>
  );
}

export function ExerciseLibraryFilters(props: ExerciseLibraryFiltersProps) {
  const activeFilterCount = [
    props.primaryFilter !== 'all',
    props.equipmentFilter !== 'all',
    props.categoryFilter !== 'all',
    props.showArchived,
  ].filter(Boolean).length;

  const filterFields = <FilterFields {...props} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="library-search" className="text-xs">
            Search exercises
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="library-search"
              type="search"
              placeholder="Name, muscle, equipment, notes…"
              value={props.search}
              onChange={(e) => props.onSearchChange(e.target.value)}
              className="h-10 pl-9"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="hidden shrink-0 sm:block">
          <Popover>
            <PopoverTrigger asChild>
              <FiltersTriggerButton activeFilterCount={activeFilterCount} />
            </PopoverTrigger>
            <PopoverContent
              className="w-[min(20rem,calc(100vw-2rem))] p-4"
              align="end"
              sideOffset={8}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Filter library</p>
                {props.hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn('h-8 px-2 text-muted-foreground', touchActionClass)}
                    onClick={props.onResetFilters}
                  >
                    Clear all
                  </Button>
                ) : null}
              </div>
              {filterFields}
            </PopoverContent>
          </Popover>
        </div>

        <div className="sm:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <FiltersTriggerButton
                activeFilterCount={activeFilterCount}
                className="w-full"
              />
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter exercises</SheetTitle>
              </SheetHeader>
              <div className="pt-4">{filterFields}</div>
              {props.hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={cn('mt-4 w-full', touchActionClass)}
                  onClick={props.onResetFilters}
                >
                  Clear all filters
                </Button>
              ) : null}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {props.hasActiveFilters ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ActiveFilterChips
            primaryFilter={props.primaryFilter}
            equipmentFilter={props.equipmentFilter}
            categoryFilter={props.categoryFilter}
            showArchived={props.showArchived}
            onPrimaryFilterChange={props.onPrimaryFilterChange}
            onEquipmentFilterChange={props.onEquipmentFilterChange}
            onCategoryFilterChange={props.onCategoryFilterChange}
            onShowArchivedChange={props.onShowArchivedChange}
          />
          {props.onResetFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'hidden h-8 shrink-0 px-2 text-muted-foreground sm:inline-flex',
                touchActionClass
              )}
              onClick={props.onResetFilters}
            >
              Clear all
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
