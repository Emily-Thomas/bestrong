'use client';

import { Archive, Edit2, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type ExerciseLibraryExercise, exerciseLibraryApi } from '@/lib/api';

interface ExerciseFormState {
  id?: number;
  name: string;
  primary_muscle_group: string;
  equipment: string;
  category: string;
  default_sets: string;
  default_reps: string;
  default_load: string;
  default_rest_seconds: string;
  default_tempo: string;
  notes: string;
}

const EMPTY_FORM: ExerciseFormState = {
  name: '',
  primary_muscle_group: '',
  equipment: '',
  category: '',
  default_sets: '',
  default_reps: '',
  default_load: '',
  default_rest_seconds: '',
  default_tempo: '',
  notes: '',
};

export default function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState<ExerciseLibraryExercise[]>([]);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState<ExerciseFormState>(EMPTY_FORM);
  const [primaryFilter, setPrimaryFilter] = useState<string>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 24;

  useEffect(() => {
    const load = async () => {
      const response = await exerciseLibraryApi.getAll({ status: 'all' });
      if (response.success && response.data) {
        setExercises(response.data);
      }
    };
    void load();
  }, []);

  const primaryOptions = useMemo(() => {
    const values = new Set<string>();
    for (const ex of exercises) {
      if (ex.primary_muscle_group) {
        values.add(ex.primary_muscle_group);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  const equipmentOptions = useMemo(() => {
    const values = new Set<string>();
    for (const ex of exercises) {
      if (ex.equipment) {
        values.add(ex.equipment);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    for (const ex of exercises) {
      if (ex.category) {
        values.add(ex.category);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = exercises.filter((ex) => {
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
    return filtered;
  }, [
    exercises,
    search,
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

  const startCreate = () => {
    setFormState(EMPTY_FORM);
    setFormOpen(true);
  };

  const startEdit = (exercise: ExerciseLibraryExercise) => {
    setFormState({
      id: exercise.id,
      name: exercise.name,
      primary_muscle_group: exercise.primary_muscle_group || '',
      equipment: exercise.equipment || '',
      category: exercise.category || '',
      default_sets:
        exercise.default_sets !== undefined
          ? String(exercise.default_sets)
          : '',
      default_reps:
        exercise.default_reps !== undefined
          ? String(exercise.default_reps)
          : '',
      default_load: exercise.default_load || '',
      default_rest_seconds:
        exercise.default_rest_seconds !== undefined
          ? String(exercise.default_rest_seconds)
          : '',
      default_tempo: exercise.default_tempo || '',
      notes: exercise.notes || '',
    });
    setFormOpen(true);
  };

  const handleFormChange = (field: keyof ExerciseFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formState.name.trim()) return;

    const payload = {
      name: formState.name.trim(),
      primary_muscle_group: formState.primary_muscle_group.trim() || undefined,
      equipment: formState.equipment.trim() || undefined,
      category: formState.category.trim() || undefined,
      default_sets: formState.default_sets
        ? parseInt(formState.default_sets, 10)
        : undefined,
      default_reps: formState.default_reps.trim() || undefined,
      default_load: formState.default_load.trim() || undefined,
      default_rest_seconds: formState.default_rest_seconds
        ? parseInt(formState.default_rest_seconds, 10)
        : undefined,
      default_tempo: formState.default_tempo.trim() || undefined,
      notes: formState.notes.trim() || undefined,
    };

    if (formState.id) {
      const response = await exerciseLibraryApi.update(formState.id, payload);
      if (response.success && response.data) {
        const updatedExercise = response.data;
        setExercises((prev) =>
          prev.map((ex) =>
            ex.id === updatedExercise.id ? updatedExercise : ex
          )
        );
      }
    } else {
      const response = await exerciseLibraryApi.create(payload);
      if (response.success && response.data) {
        const newExercise = response.data;
        setExercises((prev) => [...prev, newExercise]);
      }
    }

    setFormOpen(false);
  };

  const handleArchive = async (id: number) => {
    const response = await exerciseLibraryApi.archive(id);
    if (response.success && response.data) {
      const archived = response.data;
      setExercises((prev) =>
        prev.map((ex) => (ex.id === archived.id ? archived : ex))
      );
    }
  };

  const handleRefresh = async () => {
    const response = await exerciseLibraryApi.getAll({
      status: showArchived ? 'all' : 'active',
    });
    if (response.success && response.data) {
      setExercises(response.data);
    }
    setPage(1);
  };

  return (
    <ProtectedRoute>
      <AppShell
        title="Exercise Library"
        description="Manage reusable exercises to quickly build client workouts"
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Create and manage atomic exercises (e.g., Barbell Bench Press,
                Back Squat) for reuse in workouts.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload
              </Button>
              <Button size="sm" onClick={startCreate}>
                <Plus className="mr-2 h-4 w-4" />
                New Exercise
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Exercises</CardTitle>
              <CardDescription>
                Search and filter your exercise library. Archived exercises are
                hidden by default.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  placeholder="Search by name, muscle group, equipment, or notes..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="sm:max-w-sm"
                />
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <Select
                    value={primaryFilter}
                    onValueChange={(value) => {
                      setPrimaryFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
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
                  <Select
                    value={equipmentFilter}
                    onValueChange={(value) => {
                      setEquipmentFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
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
                  <Select
                    value={categoryFilter}
                    onValueChange={(value) => {
                      setCategoryFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
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
                  <div className="flex items-center gap-2 text-sm">
                    <Input
                      id="show-archived"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={showArchived}
                      onChange={(e) => {
                        setShowArchived(e.target.checked);
                        setPage(1);
                      }}
                    />
                    <Label htmlFor="show-archived" className="text-sm">
                      Show archived
                    </Label>
                  </div>
                </div>
              </div>

              {filteredExercises.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No exercises found. Try adjusting your search, toggling
                  archived exercises, or create a new one.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {paginatedExercises.map((exercise) => (
                    <Card
                      key={exercise.id}
                      className="cursor-pointer transition hover:shadow-md"
                      onClick={() => startEdit(exercise)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">
                              {exercise.name}
                            </CardTitle>
                            <CardDescription>
                              {exercise.primary_muscle_group ||
                                'Muscle group not set'}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {exercise.category && (
                              <Badge variant="outline" className="text-xs">
                                {exercise.category}
                              </Badge>
                            )}
                            {exercise.equipment && (
                              <Badge variant="secondary" className="text-xs">
                                {exercise.equipment}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex flex-wrap gap-2">
                          {exercise.default_sets !== undefined &&
                            exercise.default_reps !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                {exercise.default_sets} x{' '}
                                {exercise.default_reps}
                              </Badge>
                            )}
                          {exercise.default_load && (
                            <Badge variant="outline" className="text-xs">
                              {exercise.default_load}
                            </Badge>
                          )}
                          {exercise.default_rest_seconds !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              Rest {exercise.default_rest_seconds}s
                            </Badge>
                          )}
                        </div>
                        {exercise.notes && (
                          <p className="line-clamp-2">{exercise.notes}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(exercise);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            {exercise.status !== 'archived' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchive(exercise.id);
                                }}
                              >
                                <Archive className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {exercise.status === 'archived'
                              ? 'Archived'
                              : 'Active'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {filteredExercises.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
                  <span>
                    Showing {startIndex + 1}–
                    {Math.min(startIndex + PAGE_SIZE, totalItems)} of{' '}
                    {totalItems} exercises
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Exercise Form Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {formState.id ? 'Edit Exercise' : 'New Exercise'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="exercise-name">Exercise Name</Label>
                <Input
                  id="exercise-name"
                  value={formState.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="e.g., Barbell Bench Press"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary-muscle">Primary Muscle Group</Label>
                  <Input
                    id="primary-muscle"
                    value={formState.primary_muscle_group}
                    onChange={(e) =>
                      handleFormChange('primary_muscle_group', e.target.value)
                    }
                    placeholder="e.g., Chest"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="equipment">Equipment</Label>
                  <Input
                    id="equipment"
                    value={formState.equipment}
                    onChange={(e) =>
                      handleFormChange('equipment', e.target.value)
                    }
                    placeholder="e.g., Barbell, Dumbbell"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formState.category}
                  onChange={(e) => handleFormChange('category', e.target.value)}
                  placeholder="e.g., Strength, Accessory, Warmup"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default-sets">Default Sets</Label>
                  <Input
                    id="default-sets"
                    type="number"
                    min="0"
                    value={formState.default_sets}
                    onChange={(e) =>
                      handleFormChange('default_sets', e.target.value)
                    }
                    placeholder="e.g., 3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-reps">Default Reps</Label>
                  <Input
                    id="default-reps"
                    value={formState.default_reps}
                    onChange={(e) =>
                      handleFormChange('default_reps', e.target.value)
                    }
                    placeholder="e.g., 8-10"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default-load">Default Load</Label>
                  <Input
                    id="default-load"
                    value={formState.default_load}
                    onChange={(e) =>
                      handleFormChange('default_load', e.target.value)
                    }
                    placeholder="e.g., RIR 2 or 70% 1RM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-rest">Default Rest (seconds)</Label>
                  <Input
                    id="default-rest"
                    type="number"
                    min="0"
                    value={formState.default_rest_seconds}
                    onChange={(e) =>
                      handleFormChange('default_rest_seconds', e.target.value)
                    }
                    placeholder="e.g., 90"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-tempo">Default Tempo</Label>
                <Input
                  id="default-tempo"
                  value={formState.default_tempo}
                  onChange={(e) =>
                    handleFormChange('default_tempo', e.target.value)
                  }
                  placeholder="e.g., 3-1-1-0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Coaching Notes</Label>
                <Textarea
                  id="notes"
                  value={formState.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="Setup, cues, common errors to watch out for..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} type="button">
                  Save Exercise
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </AppShell>
    </ProtectedRoute>
  );
}
