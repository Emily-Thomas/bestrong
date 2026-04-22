'use client';

import {
  AlertTriangle,
  ChevronRight,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type CreateTrainerInput, type Trainer, trainersApi } from '@/lib/api';

const EMPTY_FORM: CreateTrainerInput = {
  first_name: '',
  last_name: '',
  email: '',
  title: '',
  image_url: '',
  raw_trainer_definition: '',
  raw_client_needs: '',
};

function initials(first: string, last: string): string {
  const a = first.trim().charAt(0).toUpperCase();
  const b = last.trim().charAt(0).toUpperCase();
  return a + b || '?';
}

function trainerToForm(t: Trainer): CreateTrainerInput {
  return {
    first_name: t.first_name,
    last_name: t.last_name,
    email: t.email ?? '',
    title: t.title,
    image_url: t.image_url ?? '',
    raw_trainer_definition: t.raw_trainer_definition,
    raw_client_needs: t.raw_client_needs,
  };
}

function TrainersPageContent() {
  const searchParams = useSearchParams();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateTrainerInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await trainersApi.getAll();
    if (res.success && res.data) {
      setTrainers(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (t: Trainer) => {
    setEditingId(t.id);
    setForm(trainerToForm(t));
    setFormError(null);
    setDialogOpen(true);
  };

  useEffect(() => {
    const raw = searchParams.get('edit');
    if (!raw || trainers.length === 0) return;
    const id = parseInt(raw, 10);
    if (Number.isNaN(id)) return;
    const t = trainers.find((x) => x.id === id);
    if (t) {
      setEditingId(t.id);
      setForm(trainerToForm(t));
      setFormError(null);
      setDialogOpen(true);
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/trainers');
      }
    }
  }, [searchParams, trainers]);

  const sortTrainers = (list: Trainer[]) =>
    [...list].sort((a, b) => {
      const ln = a.last_name.localeCompare(b.last_name);
      if (ln !== 0) return ln;
      return a.first_name.localeCompare(b.first_name);
    });

  const submit = async () => {
    setFormError(null);
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError('First and last name are required.');
      return;
    }
    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!form.raw_trainer_definition.trim()) {
      setFormError('Trainer definition is required.');
      return;
    }
    if (!form.raw_client_needs.trim()) {
      setFormError('Client needs description is required.');
      return;
    }

    setSaving(true);
    const payload: CreateTrainerInput = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email?.trim() || undefined,
      title: form.title.trim(),
      image_url: form.image_url?.trim() || undefined,
      raw_trainer_definition: form.raw_trainer_definition.trim(),
      raw_client_needs: form.raw_client_needs.trim(),
    };

    if (editingId !== null) {
      const res = await trainersApi.update(editingId, payload);
      setSaving(false);
      if (res.success && res.data) {
        const updated = res.data;
        setTrainers((prev) =>
          sortTrainers(prev.map((x) => (x.id === updated.id ? updated : x)))
        );
        setDialogOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        return;
      }
      setFormError(res.error || 'Could not update trainer.');
      return;
    }

    const res = await trainersApi.create(payload);
    setSaving(false);
    if (res.success && res.data) {
      const created = res.data;
      setTrainers((prev) => sortTrainers([...prev, created]));
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      return;
    }
    setFormError(res.error || 'Could not save trainer.');
  };

  return (
    <ProtectedRoute>
      <AppShell
        title="Trainers"
        description="Coaching profiles that help Milo understand your style and approach"
        action={
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Trainer
          </Button>
        }
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading trainers...</p>
          </div>
        ) : trainers.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Ready to add your first trainer?</h3>
              <CardDescription className="mb-6 max-w-sm mx-auto">
                Create coaching profiles that help Milo understand your unique style and approach
              </CardDescription>
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Trainer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {trainers.map((t) => (
              <Card
                key={t.id}
                className="overflow-hidden shadow-md transition-all hover:shadow-lg hover:border-primary/30 flex flex-col"
              >
                <div className="flex flex-1 min-h-0">
                  <Link
                    href={`/trainers/${t.id}`}
                    className="flex flex-1 min-w-0 gap-4 p-5 hover:bg-muted/25 transition-colors group"
                  >
                    <Avatar className="h-16 w-16 rounded-xl border border-border/60 shrink-0">
                      {t.image_url ? (
                        <AvatarImage src={t.image_url} alt="" />
                      ) : null}
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-semibold">
                        {initials(t.first_name, t.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg leading-snug group-hover:text-primary transition-colors">
                          {t.first_name} {t.last_name}
                        </CardTitle>
                        {t.persona_stale && t.structured_persona ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-5 border-amber-500/40 text-amber-800 dark:text-amber-300"
                          >
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                            Stale
                          </Badge>
                        ) : t.structured_persona && !t.persona_stale ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-5 gap-0.5 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-0"
                          >
                            <Sparkles className="h-3 w-3" />
                            Persona
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-5"
                          >
                            Draft
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {t.title}
                      </p>
                      {t.email ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{t.email}</span>
                        </p>
                      ) : null}
                      {!t.structured_persona ? (
                        <p className="text-xs text-muted-foreground pt-1">
                          Generate a structured coaching persona from your raw
                          notes.
                        </p>
                      ) : (
                        <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3 pt-0.5">
                          {t.structured_persona.coaching_headline}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary pt-1">
                        View full profile
                        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </Link>
                  <div className="shrink-0 pt-3 pr-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(t)}
                      aria-label={`Edit ${t.first_name} ${t.last_name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingId(null);
              setFormError(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId !== null ? 'Edit Trainer' : 'Add Trainer'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="trainer-first">First name</Label>
                  <Input
                    id="trainer-first"
                    value={form.first_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, first_name: e.target.value }))
                    }
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trainer-last">Last name</Label>
                  <Input
                    id="trainer-last"
                    value={form.last_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, last_name: e.target.value }))
                    }
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainer-email">Email</Label>
                <Input
                  id="trainer-email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  autoComplete="email"
                  placeholder="coach@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainer-title">Title</Label>
                <Input
                  id="trainer-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g. Head Coach, Performance Specialist"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainer-photo">Photo URL (optional)</Label>
                <Input
                  id="trainer-photo"
                  value={form.image_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, image_url: e.target.value }))
                  }
                  placeholder="https://…"
                />
                <p className="text-xs text-muted-foreground">
                  Paste an image URL, or leave blank to use initials on the
                  card.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainer-def">
                  What defines them as a trainer
                </Label>
                <Textarea
                  id="trainer-def"
                  value={form.raw_trainer_definition}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      raw_trainer_definition: e.target.value,
                    }))
                  }
                  placeholder="Philosophy, methodology, how they program, what they emphasize or avoid…"
                  rows={5}
                  className="resize-y min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainer-clients">
                  What defines their clients&apos; needs
                </Label>
                <Textarea
                  id="trainer-clients"
                  value={form.raw_client_needs}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      raw_client_needs: e.target.value,
                    }))
                  }
                  placeholder="Typical goals, experience level, constraints, equipment, lifestyle…"
                  rows={5}
                  className="resize-y min-h-[120px]"
                />
              </div>
              {formError ? (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-sm text-destructive">{formError}</p>
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void submit()}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingId !== null ? (
                  'Save Changes'
                ) : (
                  'Add Trainer'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function TrainersPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute>
          <AppShell title="Trainers">
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading trainers...</p>
            </div>
          </AppShell>
        </ProtectedRoute>
      }
    >
      <TrainersPageContent />
    </Suspense>
  );
}
