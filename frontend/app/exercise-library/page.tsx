'use client';

import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  type ExerciseLibraryExercise,
  exerciseLibraryApi,
} from '@/lib/api';
import {
  fetchExerciseLibrary,
  invalidateExerciseLibraryCache,
} from '@/lib/exercise-library-cache';
import { touchActionClass } from '@/lib/touch-targets';
import { cn } from '@/lib/utils';
import { ArchiveExerciseDialog } from './components/ArchiveExerciseDialog';
import { ExerciseFormSheet } from './components/ExerciseFormSheet';
import { ExerciseLibraryFilters } from './components/ExerciseLibraryFilters';
import { ExerciseLibraryListPanel } from './components/ExerciseLibraryListPanel';
import {
  EMPTY_EXERCISE_FORM,
  exerciseToFormState,
  formStateToPayload,
  serializeExerciseForm,
  type ExerciseFormState,
} from './lib/exercise-form';

const PAGE_SIZE = 24;

export default function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState<ExerciseLibraryExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [listNotice, setListNotice] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] =
    useState<ExerciseFormState>(EMPTY_EXERCISE_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [primaryFilter, setPrimaryFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [archiveTarget, setArchiveTarget] =
    useState<ExerciseLibraryExercise | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingFormState, setPendingFormState] =
    useState<ExerciseFormState | null>(null);
  const [pendingCloseSheet, setPendingCloseSheet] = useState(false);
  const formBaselineRef = useRef('');

  const isFormDirty =
    formOpen && serializeExerciseForm(formState) !== formBaselineRef.current;

  const openForm = useCallback((state: ExerciseFormState) => {
    setFormState(state);
    formBaselineRef.current = serializeExerciseForm(state);
    setFormError('');
    setSaveSuccess(false);
    setFormOpen(true);
  }, []);

  const applyPendingForm = useCallback(() => {
    if (pendingCloseSheet) {
      setFormOpen(false);
      setPendingCloseSheet(false);
    } else if (pendingFormState) {
      openForm(pendingFormState);
      setPendingFormState(null);
    }
    setDiscardDialogOpen(false);
  }, [pendingCloseSheet, pendingFormState, openForm]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 200);
    return () => window.clearTimeout(handle);
  }, [search]);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setListError('');
    setListNotice('');
    try {
      const status = showArchived ? 'all' : 'active';
      const data = await fetchExerciseLibrary(status);
      setExercises(data);
    } catch {
      setListError('Scout could not load your exercise library. Try Reload.');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  const primaryOptions = useMemo(() => {
    const values = new Set<string>();
    for (const ex of exercises) {
      if (ex.primary_muscle_group) values.add(ex.primary_muscle_group);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  const equipmentOptions = useMemo(() => {
    const values = new Set<string>();
    for (const ex of exercises) {
      if (ex.equipment) values.add(ex.equipment);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    for (const ex of exercises) {
      if (ex.category) values.add(ex.category);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (!showArchived && ex.status === 'archived') return false;
      if (
        primaryFilter !== 'all' &&
        ex.primary_muscle_group !== primaryFilter
      ) {
        return false;
      }
      if (equipmentFilter !== 'all' && ex.equipment !== equipmentFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && ex.category !== categoryFilter) {
        return false;
      }
      if (!term) return true;
      return (
        ex.name.toLowerCase().includes(term) ||
        (ex.primary_muscle_group || '').toLowerCase().includes(term) ||
        (ex.equipment || '').toLowerCase().includes(term) ||
        (ex.category || '').toLowerCase().includes(term) ||
        (ex.notes || '').toLowerCase().includes(term)
      );
    });
  }, [
    exercises,
    debouncedSearch,
    showArchived,
    primaryFilter,
    equipmentFilter,
    categoryFilter,
  ]);

  const totalItems = filteredExercises.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedExercises = filteredExercises.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const resetFiltersPage = useCallback(() => setPage(1), []);

  const resetAllFilters = useCallback(() => {
    setSearch('');
    setPrimaryFilter('all');
    setEquipmentFilter('all');
    setCategoryFilter('all');
    setShowArchived(false);
    resetFiltersPage();
  }, [resetFiltersPage]);

  const hasActiveFilters =
    debouncedSearch.trim().length > 0 ||
    primaryFilter !== 'all' ||
    equipmentFilter !== 'all' ||
    categoryFilter !== 'all' ||
    showArchived;

  const requestOpenForm = useCallback(
    (state: ExerciseFormState) => {
      if (formOpen && isFormDirty) {
        setPendingFormState(state);
        setPendingCloseSheet(false);
        setDiscardDialogOpen(true);
        return;
      }
      openForm(state);
    },
    [formOpen, isFormDirty, openForm]
  );

  const startCreate = () => {
    requestOpenForm(EMPTY_EXERCISE_FORM);
  };

  const startEdit = useCallback(
    (exercise: ExerciseLibraryExercise) => {
      requestOpenForm(exerciseToFormState(exercise));
    },
    [requestOpenForm]
  );

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setFormOpen(true);
      return;
    }
    if (isFormDirty) {
      setPendingCloseSheet(true);
      setPendingFormState(null);
      setDiscardDialogOpen(true);
      return;
    }
    setFormOpen(false);
    setFormError('');
    setSaveSuccess(false);
  };

  const handleFormChange = (field: keyof ExerciseFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError('');
    if (saveSuccess) setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!formState.name.trim()) {
      setFormError('Add an exercise name before saving.');
      return;
    }

    setSaving(true);
    setFormError('');
    const payload = formStateToPayload(formState);

    try {
      if (formState.id) {
        const response = await exerciseLibraryApi.update(formState.id, payload);
        if (response.success && response.data) {
          const updated = response.data;
          setExercises((prev) =>
            prev.map((ex) => (ex.id === updated.id ? updated : ex))
          );
          invalidateExerciseLibraryCache();
          const nextState = exerciseToFormState(updated);
          setFormState(nextState);
          formBaselineRef.current = serializeExerciseForm(nextState);
          setSaveSuccess(true);
        } else {
          setFormError(
            response.error || 'Could not update this exercise. Try again.'
          );
        }
      } else {
        const response = await exerciseLibraryApi.create(payload);
        if (response.success && response.data) {
          setExercises((prev) => [...prev, response.data!]);
          invalidateExerciseLibraryCache();
          setFormOpen(false);
          setSaveSuccess(false);
        } else {
          setFormError(
            response.error || 'Could not create this exercise. Try again.'
          );
        }
      }
    } catch {
      setFormError('Something went wrong while saving. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    setListError('');
    try {
      const response = await exerciseLibraryApi.archive(archiveTarget.id);
      if (response.success && response.data) {
        const archived = response.data;
        setExercises((prev) =>
          prev.map((ex) => (ex.id === archived.id ? archived : ex))
        );
        invalidateExerciseLibraryCache();
        setArchiveTarget(null);
        setListNotice(
          `"${archived.name}" archived. Turn on Show archived to find it again.`
        );
      } else {
        setListError(
          response.error || 'Could not archive this exercise. Try again.'
        );
      }
    } catch {
      setListError('Something went wrong while archiving. Try again.');
    } finally {
      setArchiving(false);
    }
  };

  const handleReload = async () => {
    invalidateExerciseLibraryCache();
    setPage(1);
    await loadExercises();
  };

  return (
    <ProtectedRoute>
      <AppShell
        title="Exercise library"
        description="Reusable moves Scout can drop into client workouts"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="font-mono text-sm tabular-nums text-muted-foreground">
                {!loading ? (
                  hasActiveFilters ? (
                    <>
                      <span className="font-medium text-foreground">
                        {totalItems}
                      </span>{' '}
                      matching ·{' '}
                      <span className="font-medium text-foreground">
                        {exercises.length}
                      </span>{' '}
                      in library
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">
                        {exercises.length}
                      </span>{' '}
                      {exercises.length === 1 ? 'exercise' : 'exercises'}
                    </>
                  )
                ) : (
                  'Loading library…'
                )}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                className={touchActionClass}
                onClick={() => void handleReload()}
                disabled={loading}
                aria-busy={loading}
              >
                <RefreshCw
                  className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
                  aria-hidden
                />
                {loading ? 'Reloading…' : 'Reload'}
              </Button>
              <Button
                size="sm"
                className={touchActionClass}
                onClick={startCreate}
              >
                New exercise
              </Button>
            </div>
          </header>

          {(listError || listNotice) && (
            <div className="flex flex-col gap-3">
              {listError ? (
                <Alert variant="destructive" role="alert" aria-live="assertive">
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                    <span>{listError}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 px-2 text-destructive hover:text-destructive"
                      onClick={() => setListError('')}
                    >
                      Dismiss
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
              {listNotice ? (
                <Alert variant="success" aria-live="polite">
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                    <span>{listNotice}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 px-2"
                      onClick={() => setListNotice('')}
                    >
                      Dismiss
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          )}

          <section
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            aria-label="Exercise library"
          >
            <div className="border-b border-border bg-muted/20 px-4 py-4 sm:px-6">
              <ExerciseLibraryFilters
                search={search}
                onSearchChange={(value) => {
                  setSearch(value);
                  resetFiltersPage();
                }}
                primaryFilter={primaryFilter}
                equipmentFilter={equipmentFilter}
                categoryFilter={categoryFilter}
                onPrimaryFilterChange={(value) => {
                  setPrimaryFilter(value);
                  resetFiltersPage();
                }}
                onEquipmentFilterChange={(value) => {
                  setEquipmentFilter(value);
                  resetFiltersPage();
                }}
                onCategoryFilterChange={(value) => {
                  setCategoryFilter(value);
                  resetFiltersPage();
                }}
                showArchived={showArchived}
                onShowArchivedChange={(checked) => {
                  setShowArchived(checked);
                  resetFiltersPage();
                }}
                primaryOptions={primaryOptions}
                equipmentOptions={equipmentOptions}
                categoryOptions={categoryOptions}
                onResetFilters={resetAllFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>

            <ExerciseLibraryListPanel
              loading={loading}
              exercises={exercises}
              filteredCount={filteredExercises.length}
              paginatedExercises={paginatedExercises}
              editingExerciseId={formOpen ? formState.id ?? null : null}
              startIndex={startIndex}
              pageSize={PAGE_SIZE}
              totalItems={totalItems}
              currentPage={currentPage}
              totalPages={totalPages}
              onStartCreate={startCreate}
              onEdit={startEdit}
              onRequestArchive={setArchiveTarget}
              onPageChange={setPage}
              onResetFilters={resetAllFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </section>
        </div>

        <ExerciseFormSheet
          open={formOpen}
          onOpenChange={handleSheetOpenChange}
          formState={formState}
          onFieldChange={handleFormChange}
          onSave={() => void handleSave()}
          saving={saving}
          formError={formError}
          saveSuccess={saveSuccess}
          primaryOptions={primaryOptions}
          equipmentOptions={equipmentOptions}
          categoryOptions={categoryOptions}
        />

        <ArchiveExerciseDialog
          exercise={archiveTarget}
          archiving={archiving}
          onOpenChange={(open) => {
            if (!open && !archiving) setArchiveTarget(null);
          }}
          onConfirm={() => void confirmArchive()}
        />

        <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
              <AlertDialogDescription>
                You have edits that are not saved yet. Discard them to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setPendingFormState(null);
                  setPendingCloseSheet(false);
                }}
              >
                Keep editing
              </AlertDialogCancel>
              <AlertDialogAction onClick={applyPendingForm}>
                Discard changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppShell>
    </ProtectedRoute>
  );
}
