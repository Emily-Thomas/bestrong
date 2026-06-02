'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Mail,
  Pencil,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DeleteTrainerDialog } from '../components/DeleteTrainerDialog';
import { PersonaGeneratePanel } from '../components/PersonaGeneratePanel';
import { RegeneratePersonaDialog } from '../components/RegeneratePersonaDialog';
import { TrainerDismissibleBanner } from '../components/TrainerDismissibleBanner';
import { TrainerPersonaStatusBadge } from '../components/TrainerPersonaStatusBadge';
import {
  trainerAvatarAlt,
  trainerDisplayName,
  trainerInitials,
  trainerPersonaStatus,
} from '../lib/trainer-utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Trainer, trainersApi } from '@/lib/api';
import { touchActionClass } from '@/lib/touch-targets';
import { cn } from '@/lib/utils';

function TrainerDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = params.id;
  const id =
    typeof idParam === 'string'
      ? parseInt(idParam, 10)
      : Array.isArray(idParam)
        ? parseInt(idParam[0], 10)
        : NaN;

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState(false);
  const arrivalHandled = useRef(false);

  const load = useCallback(async () => {
    if (Number.isNaN(id)) {
      setLoading(false);
      return;
    }
    setLoadError('');
    setLoading(true);
    const res = await trainersApi.getById(id);
    if (res.success && res.data) {
      setTrainer(res.data);
    } else {
      setTrainer(null);
      setLoadError(
        res.error || 'We could not load this trainer. Try again in a moment.'
      );
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (arrivalHandled.current) return;
    const saved = searchParams.get('saved');
    const created = searchParams.get('created');
    if (saved !== '1' && created !== '1') return;
    arrivalHandled.current = true;
    if (saved === '1') {
      setBanner(
        'Profile updated. Regenerate the persona if coaching notes changed.'
      );
      setBannerSuccess(false);
    } else {
      setBanner('Trainer added. Generate a persona when you are ready.');
      setBannerSuccess(true);
    }
    router.replace(`/trainers/${id}`, { scroll: false });
  }, [searchParams, router, id]);

  const runGenerate = async () => {
    if (Number.isNaN(id)) return;
    setGenError(null);
    setGenerating(true);
    const res = await trainersApi.generatePersona(id);
    setGenerating(false);
    if (res.success && res.data) {
      setTrainer(res.data);
      setBanner(
        'Persona ready. Review the tabs below before using this coach on new programs.'
      );
      setBannerSuccess(true);
      return;
    }
    setGenError(res.error || 'Generation failed. Try again in a moment.');
  };

  const handleDelete = async () => {
    if (Number.isNaN(id)) return;
    setDeleting(true);
    const res = await trainersApi.delete(id);
    setDeleting(false);
    if (res.success) {
      router.push('/trainers');
      return;
    }
    setGenError(res.error || 'Could not remove trainer.');
    setDeleteOpen(false);
  };

  const p = trainer?.structured_persona;
  const status = trainer ? trainerPersonaStatus(trainer) : null;

  return (
    <ProtectedRoute>
      <AppShell
        backAction={
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link href="/trainers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Trainers
            </Link>
          </Button>
        }
      >
        {loading ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 shadow-sm"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2
              className="mb-3 h-8 w-8 animate-spin text-primary motion-reduce:animate-none"
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
                onClick={() => void load()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : !trainer || Number.isNaN(id) ? (
          <Card className="max-w-lg border-dashed shadow-sm">
            <CardHeader>
              <CardTitle>Trainer not found</CardTitle>
              <CardDescription>
                This profile may have been removed or the link is wrong.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/trainers">Back to trainers</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6 pb-12">
            {banner ? (
              <TrainerDismissibleBanner
                message={banner}
                variant={bannerSuccess ? 'success' : 'default'}
                onDismiss={() => setBanner(null)}
              />
            ) : null}

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-5">
                  <Avatar className="h-20 w-20 shrink-0 rounded-xl border border-border sm:h-24 sm:w-24">
                    {trainer.image_url ? (
                      <AvatarImage
                        src={trainer.image_url}
                        alt={trainerAvatarAlt(trainer)}
                      />
                    ) : null}
                    <AvatarFallback className="rounded-xl bg-muted text-lg font-semibold text-foreground sm:text-2xl">
                      {trainerInitials(trainer.first_name, trainer.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                        {trainerDisplayName(trainer)}
                      </h1>
                      {status ? (
                        <TrainerPersonaStatusBadge status={status} />
                      ) : null}
                    </div>
                    <p className="text-muted-foreground">{trainer.title}</p>
                    {trainer.email ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                        {trainer.email}
                      </p>
                    ) : null}
                    {trainer.persona_generated_at ? (
                      <p className="text-xs text-muted-foreground">
                        Persona last generated{' '}
                        {new Date(trainer.persona_generated_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {p ? (
                    <Button
                      type="button"
                      variant="default"
                      disabled={generating}
                      className={touchActionClass}
                      onClick={() => setRegenOpen(true)}
                    >
                      {generating ? 'Regenerating…' : 'Regenerate persona'}
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    className={cn('gap-2', touchActionClass)}
                    asChild
                  >
                    <Link href={`/trainers/new?edit=${trainer.id}`}>
                      <Pencil className="h-4 w-4" aria-hidden />
                      Edit details
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'gap-2 text-destructive hover:text-destructive',
                      touchActionClass
                    )}
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Remove
                  </Button>
                </div>
              </div>

              {genError ? (
                <p className="mt-4 text-sm text-destructive" role="alert">
                  {genError}
                </p>
              ) : null}

              {trainer.persona_stale && p ? (
                <p className="mt-4 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden
                  />
                  <span>
                    Raw coaching text changed since this persona was generated.
                    Regenerate to align Scout with your latest notes.
                  </span>
                </p>
              ) : null}
            </div>

            {!p ? (
              <PersonaGeneratePanel
                hasPersona={false}
                generating={generating}
                onGenerate={() => void runGenerate()}
              />
            ) : (
              <>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid h-auto w-full max-w-lg grid-cols-3 gap-1 p-1">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="full">Full profile</TabsTrigger>
                    <TabsTrigger value="scout">For Scout</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-6">
                    <Card className="shadow-sm">
                      <CardHeader>
                        <p className="text-sm font-medium text-muted-foreground">
                          Coaching headline
                        </p>
                        <CardTitle className="text-xl font-medium leading-snug text-pretty">
                          {p.coaching_headline}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="leading-relaxed text-pretty text-muted-foreground">
                          {p.coaching_narrative}
                        </p>
                        <Separator />
                        <div>
                          <h3 className="mb-3 text-sm font-medium">
                            Programming pillars
                          </h3>
                          {(p.programming_pillars ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No pillars were returned. Regenerate the persona to
                              try again.
                            </p>
                          ) : (
                          <ul className="space-y-3">
                            {(p.programming_pillars ?? []).map((pillar) => (
                              <li
                                key={pillar.name}
                                className="rounded-lg border border-border bg-muted/15 px-4 py-3"
                              >
                                <p className="text-sm font-medium">
                                  {pillar.name}
                                </p>
                                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                  {pillar.summary}
                                </p>
                              </li>
                            ))}
                          </ul>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="full" className="mt-6">
                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Full profile</CardTitle>
                        <CardDescription>
                          Structured fields Scout derived from your raw notes.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 text-sm leading-relaxed text-muted-foreground">
                        <section className="space-y-2">
                          <h3 className="text-sm font-medium text-foreground">
                            Coaching story
                          </h3>
                          <p className="font-medium text-foreground">
                            {p.coaching_headline}
                          </p>
                          <p>{p.coaching_narrative}</p>
                        </section>
                        <Separator />
                        <section className="space-y-3">
                          <h3 className="text-sm font-medium text-foreground">
                            Progression and intensity
                          </h3>
                          <div>
                            <p className="font-medium text-foreground">
                              Progression philosophy
                            </p>
                            <p>{p.progression_philosophy}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Intensity and effort
                            </p>
                            <p>{p.intensity_and_effort_model}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Prehab and systems
                            </p>
                            <p>{p.prehab_and_systems_integration}</p>
                          </div>
                        </section>
                        <Separator />
                        <section className="space-y-3">
                          <h3 className="text-sm font-medium text-foreground">
                            Clients
                          </h3>
                          <p>{p.client_archetype_summary}</p>
                          <div>
                            <p className="font-medium text-foreground">
                              Typical needs
                            </p>
                            <ul className="mt-2 list-disc space-y-1.5 pl-5">
                              {(p.ideal_client_needs ?? []).map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              What they avoid
                            </p>
                            <ul className="mt-2 list-disc space-y-1.5 pl-5">
                              {(p.programming_anti_patterns ?? []).map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        </section>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="scout" className="mt-6">
                    <Card className="border-border shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">
                          How Scout uses this coach
                        </CardTitle>
                        <CardDescription>
                          Program generation reads this block to honor this
                          coach&apos;s biases and rules of thumb.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {p.ai_prompt_injection?.trim() ? (
                          <pre className="max-h-[min(70vh,520px)] overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 font-mono text-sm leading-relaxed text-foreground/90">
                            {p.ai_prompt_injection}
                          </pre>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No program context block yet. Regenerate the persona
                            from your raw notes.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {generating ? (
                  <PersonaGeneratePanel
                    hasPersona
                    generating
                    onGenerate={() => void runGenerate()}
                    compact
                  />
                ) : null}
              </>
            )}

            <Collapsible open={rawOpen} onOpenChange={setRawOpen}>
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Original raw inputs
                      </CardTitle>
                      <CardDescription>
                        Verbatim text used to generate the persona. Edit on{' '}
                        <Link
                          href={`/trainers/new?edit=${trainer.id}`}
                          className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        >
                          Edit trainer details
                        </Link>
                        .
                      </CardDescription>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="shrink-0">
                        {rawOpen ? 'Hide' : 'Show'} raw text
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-6 pt-0">
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                        What defines them as a trainer
                      </h3>
                      <div className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed">
                        {trainer.raw_trainer_definition}
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                        What defines their clients&apos; needs
                      </h3>
                      <div className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed">
                        {trainer.raw_client_needs}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <RegeneratePersonaDialog
              open={regenOpen}
              onOpenChange={setRegenOpen}
              busy={generating}
              onConfirm={() => {
                setRegenOpen(false);
                void runGenerate();
              }}
            />
            <DeleteTrainerDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              firstName={trainer.first_name}
              lastName={trainer.last_name}
              deleting={deleting}
              onConfirm={() => void handleDelete()}
            />
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

export default function TrainerDetailPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute>
          <AppShell title="Trainer">
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </AppShell>
        </ProtectedRoute>
      }
    >
      <TrainerDetailContent />
    </Suspense>
  );
}
