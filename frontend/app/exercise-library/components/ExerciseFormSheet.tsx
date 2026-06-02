'use client';

import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { touchActionClass } from '@/lib/touch-targets';
import { cn } from '@/lib/utils';
import type { ExerciseFormState } from '../lib/exercise-form';
import { TaxonomyCombobox } from './TaxonomyCombobox';

interface ExerciseFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formState: ExerciseFormState;
  onFieldChange: (field: keyof ExerciseFormState, value: string) => void;
  onSave: () => void;
  saving: boolean;
  formError: string;
  saveSuccess: boolean;
  primaryOptions: string[];
  equipmentOptions: string[];
  categoryOptions: string[];
}

function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function ExerciseFormSheet({
  open,
  onOpenChange,
  formState,
  onFieldChange,
  onSave,
  saving,
  formError,
  saveSuccess,
  primaryOptions,
  equipmentOptions,
  categoryOptions,
}: ExerciseFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg lg:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b px-5 py-5 text-left sm:px-6">
          <SheetTitle className="text-balance">
            {formState.id ? 'Edit exercise' : 'New exercise'}
          </SheetTitle>
          <SheetDescription className="text-pretty">
            {formState.id
              ? 'Save, then select another row to edit the next movement.'
              : 'Add a movement your library can reuse across programs.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5 sm:px-6">
          {formError ? (
            <Alert variant="destructive" role="alert" aria-live="assertive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          {saveSuccess ? (
            <Alert variant="success" aria-live="polite">
              <AlertDescription>
                Saved. Pick another exercise in the list or close this panel.
              </AlertDescription>
            </Alert>
          ) : null}

          <FormSection title="Movement" description="Name and how you tag it in the library.">
            <div className="space-y-2">
              <Label htmlFor="exercise-name">Exercise name</Label>
              <Input
                id="exercise-name"
                value={formState.name}
                onChange={(e) => onFieldChange('name', e.target.value)}
                placeholder="e.g., Barbell bench press"
                aria-invalid={Boolean(formError && !formState.name.trim())}
              />
            </div>
            <TaxonomyCombobox
              id="primary-muscle"
              label="Primary muscle group"
              value={formState.primary_muscle_group}
              onChange={(v) => onFieldChange('primary_muscle_group', v)}
              options={primaryOptions}
              placeholder="Pick muscle group"
            />
            <TaxonomyCombobox
              id="equipment"
              label="Equipment"
              value={formState.equipment}
              onChange={(v) => onFieldChange('equipment', v)}
              options={equipmentOptions}
              placeholder="Pick equipment"
            />
            <TaxonomyCombobox
              id="category"
              label="Category"
              value={formState.category}
              onChange={(v) => onFieldChange('category', v)}
              options={categoryOptions}
              placeholder="Pick category"
            />
          </FormSection>

          <FormSection
            title="Default prescription"
            description="Pre-fills when you add this movement to a session."
            className="border-t border-border/60 pt-6"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="default-sets">Sets</Label>
                <Input
                  id="default-sets"
                  type="number"
                  min={0}
                  value={formState.default_sets}
                  onChange={(e) => onFieldChange('default_sets', e.target.value)}
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-reps">Reps</Label>
                <Input
                  id="default-reps"
                  value={formState.default_reps}
                  onChange={(e) => onFieldChange('default_reps', e.target.value)}
                  placeholder="8-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-load">Load</Label>
                <Input
                  id="default-load"
                  value={formState.default_load}
                  onChange={(e) => onFieldChange('default_load', e.target.value)}
                  placeholder="70% 1RM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-rest">Rest (sec)</Label>
                <Input
                  id="default-rest"
                  type="number"
                  min={0}
                  value={formState.default_rest_seconds}
                  onChange={(e) =>
                    onFieldChange('default_rest_seconds', e.target.value)
                  }
                  placeholder="90"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-tempo">Tempo</Label>
              <Input
                id="default-tempo"
                value={formState.default_tempo}
                onChange={(e) => onFieldChange('default_tempo', e.target.value)}
                placeholder="3-1-1-0"
              />
            </div>
          </FormSection>

          <FormSection
            title="Coaching notes"
            description="Optional cues for you and Scout when programming."
            className="border-t border-border/60 pt-6"
          >
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formState.notes}
                onChange={(e) => onFieldChange('notes', e.target.value)}
                placeholder="Setup, cues, common errors…"
                rows={4}
                className="min-h-[6rem]"
              />
            </div>
          </FormSection>
        </div>

        <SheetFooter className="shrink-0 gap-2 border-t bg-background px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            variant="outline"
            type="button"
            className={cn('sm:min-w-[5.5rem]', touchActionClass)}
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Close
          </Button>
          <Button
            type="button"
            className={cn('sm:min-w-[8rem]', touchActionClass)}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              'Save exercise'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
