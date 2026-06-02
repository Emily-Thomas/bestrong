'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TrainerFormFields } from '../components/TrainerFormFields';
import {
  EMPTY_TRAINER_FORM,
  trainerToForm,
  trimTrainerPayload,
  validateTrainerForm,
} from '../lib/trainer-form';
import { type CreateTrainerInput, trainersApi } from '@/lib/api';
import { touchActionClass } from '@/lib/touch-targets';

function TrainerFormPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editRaw = searchParams.get('edit');
  const editId =
    editRaw && !Number.isNaN(parseInt(editRaw, 10))
      ? parseInt(editRaw, 10)
      : null;

  const [form, setForm] = useState<CreateTrainerInput>(EMPTY_TRAINER_FORM);
  const [loadingTrainer, setLoadingTrainer] = useState(editId !== null);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTrainer = useCallback(async () => {
    if (editId === null) {
      setLoadingTrainer(false);
      return;
    }
    setLoadError('');
    const res = await trainersApi.getById(editId);
    if (res.success && res.data) {
      setForm(trainerToForm(res.data));
    } else {
      setLoadError(res.error || 'Could not load this trainer.');
    }
    setLoadingTrainer(false);
  }, [editId]);

  useEffect(() => {
    void loadTrainer();
  }, [loadTrainer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const validation = validateTrainerForm(form);
    if (validation) {
      setFormError(validation);
      return;
    }

    setSaving(true);
    const payload = trimTrainerPayload(form);

    if (editId !== null) {
      const res = await trainersApi.update(editId, payload);
      setSaving(false);
      if (res.success && res.data) {
        router.push(`/trainers/${res.data.id}?saved=1`);
        return;
      }
      setFormError(res.error || 'Could not update trainer.');
      return;
    }

    const res = await trainersApi.create(payload);
    setSaving(false);
    if (res.success && res.data) {
      router.push(`/trainers/${res.data.id}?created=1`);
      return;
    }
    setFormError(res.error || 'Could not save trainer.');
  };

  const title = editId !== null ? 'Edit trainer' : 'Add trainer';
  const description =
    editId !== null
      ? 'Update basics and coaching notes. Regenerate the persona on their profile if notes changed.'
      : 'Create a coaching profile Scout can learn from, then generate a structured persona.';

  return (
    <ProtectedRoute>
      <AppShell
        title={title}
        description={description}
        backAction={
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link href={editId !== null ? `/trainers/${editId}` : '/trainers'}>
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
              {editId !== null ? 'Trainer profile' : 'Trainers'}
            </Link>
          </Button>
        }
      >
        <div className="flex justify-center">
        {loadingTrainer ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 shadow-sm"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2
              className="mb-3 h-8 w-8 animate-spin text-primary"
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">
              Scout&apos;s loading this profile…
            </p>
          </div>
        ) : loadError ? (
          <Alert variant="destructive" className="max-w-lg" role="alert">
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-destructive/30 bg-background"
                onClick={() => void loadTrainer()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="w-full max-w-3xl space-y-6 pb-12"
          >
            <TrainerFormFields form={form} onChange={setForm} idPrefix="trainer-form" />

            {formError ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" asChild>
                <Link href={editId !== null ? `/trainers/${editId}` : '/trainers'}>
                  Cancel
                </Link>
              </Button>
              <Button type="submit" disabled={saving} className={touchActionClass}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : editId !== null ? (
                  'Save changes'
                ) : (
                  'Add trainer'
                )}
              </Button>
            </div>
          </form>
        )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function NewTrainerPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute>
          <AppShell title="Add trainer">
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
            </div>
          </AppShell>
        </ProtectedRoute>
      }
    >
      <TrainerFormPageContent />
    </Suspense>
  );
}
