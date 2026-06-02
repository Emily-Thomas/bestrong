'use client';

import { Dumbbell, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExerciseLibraryExercise } from '@/lib/api';
import { touchActionClass } from '@/lib/touch-targets';
import { cn } from '@/lib/utils';
import {
  ExerciseLibraryRow,
  LIBRARY_ROW_ACTIONS_CLASS,
} from './ExerciseLibraryRow';

interface ExerciseLibraryListPanelProps {
  loading: boolean;
  exercises: ExerciseLibraryExercise[];
  filteredCount: number;
  paginatedExercises: ExerciseLibraryExercise[];
  editingExerciseId: number | null;
  startIndex: number;
  pageSize: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  hasActiveFilters?: boolean;
  onStartCreate: () => void;
  onEdit: (exercise: ExerciseLibraryExercise) => void;
  onRequestArchive: (exercise: ExerciseLibraryExercise) => void;
  onPageChange: (page: number) => void;
  onResetFilters?: () => void;
}

function LoadingSkeleton() {
  return (
    <ul className="divide-y divide-border" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={`library-skeleton-${i}`} className="px-5 py-4 sm:px-6">
          <div className="h-4 max-w-[14rem] animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 max-w-[10rem] animate-pulse rounded bg-muted/70" />
        </li>
      ))}
    </ul>
  );
}

export function ExerciseLibraryListPanel({
  loading,
  exercises,
  filteredCount,
  paginatedExercises,
  editingExerciseId,
  startIndex,
  pageSize,
  totalItems,
  currentPage,
  totalPages,
  hasActiveFilters,
  onStartCreate,
  onEdit,
  onRequestArchive,
  onPageChange,
  onResetFilters,
}: ExerciseLibraryListPanelProps) {
  return (
    <>
      <div className="min-h-[12rem]">
        {loading ? (
          <output className="block w-full" aria-live="polite">
            <p className="sr-only">Scout is loading your exercise library</p>
            <LoadingSkeleton />
            <div className="flex items-center justify-center gap-2 px-6 pb-8 pt-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              Loading library…
            </div>
          </output>
        ) : filteredCount === 0 ? (
          exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Dumbbell className="h-7 w-7 text-primary" aria-hidden />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-balance">
                Ready to add your first exercise?
              </h2>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground text-pretty">
                Build your library once. Scout will use it when you program client
                sessions.
              </p>
              <Button
                size="sm"
                className={touchActionClass}
                onClick={onStartCreate}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Add exercise
              </Button>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              <p>No matches for these filters.</p>
              {hasActiveFilters && onResetFilters ? (
                <Button
                  type="button"
                  variant="link"
                  className={cn('mt-2 h-auto p-0', touchActionClass)}
                  onClick={onResetFilters}
                >
                  Clear filters
                </Button>
              ) : (
                <p className="mt-2 text-xs">
                  Try a shorter search or turn on Show archived.
                </p>
              )}
            </div>
          )
        ) : (
          <>
            <div
              className={cn(
                'hidden border-b border-border bg-muted/30 px-5 py-2.5 text-xs font-medium text-muted-foreground sm:grid sm:px-6',
                LIBRARY_ROW_ACTIONS_CLASS
              )}
              aria-hidden
            >
              <span>Exercise</span>
              <span className="text-center">Actions</span>
            </div>
            <ul aria-label="Exercise library" className="divide-y divide-border">
            {paginatedExercises.map((exercise) => (
              <ExerciseLibraryRow
                key={exercise.id}
                exercise={exercise}
                isEditing={editingExerciseId === exercise.id}
                onEdit={onEdit}
                onRequestArchive={onRequestArchive}
              />
            ))}
            </ul>
          </>
        )}
      </div>

      {!loading && filteredCount > 0 ? (
        <div className="flex flex-col gap-3 border-t border-border bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">
              {startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}
            </span>{' '}
            of{' '}
            <span className="font-medium text-foreground">{totalItems}</span>
            <span className="text-muted-foreground">
              {' '}
              · Page {currentPage} of {totalPages}
            </span>
          </p>
          <nav aria-label="Exercise list pagination" className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={touchActionClass}
              disabled={currentPage === 1}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={touchActionClass}
              disabled={currentPage === totalPages}
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
            >
              Next
            </Button>
          </nav>
        </div>
      ) : null}
    </>
  );
}
