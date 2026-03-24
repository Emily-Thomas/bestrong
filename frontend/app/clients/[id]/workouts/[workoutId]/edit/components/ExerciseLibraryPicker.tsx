'use client';

import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { type ExerciseLibraryExercise, exerciseLibraryApi } from '@/lib/api';

interface ExerciseLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: ExerciseLibraryExercise) => void;
}

export function ExerciseLibraryPicker({
  open,
  onOpenChange,
  onSelect,
}: ExerciseLibraryPickerProps) {
  const [search, setSearch] = useState('');
  const [exercises, setExercises] = useState<ExerciseLibraryExercise[]>([]);

  useEffect(() => {
    if (open) {
      const load = async () => {
        const response = await exerciseLibraryApi.getAll({ status: 'active' });
        if (response.success && response.data) {
          setExercises(response.data);
        }
      };
      void load();
    }
  }, [open]);

  const filteredExercises = useMemo(() => {
    const term = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (ex.status === 'archived') return false;
      if (!term) return true;
      return (
        ex.name.toLowerCase().includes(term) ||
        (ex.primary_muscle_group || '').toLowerCase().includes(term) ||
        (ex.equipment || '').toLowerCase().includes(term) ||
        (ex.category || '').toLowerCase().includes(term) ||
        (ex.notes || '').toLowerCase().includes(term)
      );
    });
  }, [exercises, search]);

  const handleSelect = (exercise: ExerciseLibraryExercise) => {
    onSelect(exercise);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Add Exercise from Library
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search exercises by name, muscle group, equipment, or notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {filteredExercises.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No active exercises in the library match your search. Create some
              exercises in the Exercise Library first.
            </div>
          ) : (
            <div className="grid gap-3 max-h-[420px] overflow-y-auto pr-1 md:grid-cols-2">
              {filteredExercises.map((exercise) => (
                <Card key={exercise.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{exercise.name}</CardTitle>
                    <CardDescription>
                      {exercise.primary_muscle_group || 'Muscle group not set'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-3 text-xs text-muted-foreground">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
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
                        {exercise.default_sets !== undefined &&
                          exercise.default_reps !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              {exercise.default_sets} x {exercise.default_reps}
                            </Badge>
                          )}
                        {exercise.default_load && (
                          <Badge variant="outline" className="text-xs">
                            {exercise.default_load}
                          </Badge>
                        )}
                      </div>
                      {exercise.notes && (
                        <p className="line-clamp-2">{exercise.notes}</p>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleSelect(exercise)}
                        type="button"
                      >
                        Use Exercise
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
