'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Mail,
  Pencil,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Trainer, trainersApi } from '@/lib/api';
import { cn } from '@/lib/utils';

function initials(first: string, last: string): string {
  const a = first.trim().charAt(0).toUpperCase();
  const b = last.trim().charAt(0).toUpperCase();
  return a + b || '?';
}

export default function TrainerDetailPage() {
  const params = useParams();
  const idParam = params.id;
  const id =
    typeof idParam === 'string'
      ? parseInt(idParam, 10)
      : Array.isArray(idParam)
        ? parseInt(idParam[0], 10)
        : NaN;

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [rawOpen, setRawOpen] = useState(false);

  const load = useCallback(async () => {
    if (Number.isNaN(id)) {
      setLoading(false);
      return;
    }
    const res = await trainersApi.getById(id);
    if (res.success && res.data) {
      setTrainer(res.data);
    } else {
      setTrainer(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runGenerate = async () => {
    if (Number.isNaN(id)) return;
    setGenError(null);
    setGenerating(true);
    const res = await trainersApi.generatePersona(id);
    setGenerating(false);
    if (res.success && res.data) {
      setTrainer(res.data);
      return;
    }
    setGenError(res.error || 'Generation failed.');
  };

  const p = trainer?.structured_persona;

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
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading trainer...</p>
          </div>
        ) : !trainer || Number.isNaN(id) ? (
          <Card className="max-w-lg border-dashed shadow-md">
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
          <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div
              className={cn(
                'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 sm:p-8',
                'from-primary/8 via-background to-background',
                'border-primary/15 shadow-sm'
              )}
            >
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-5 min-w-0">
                  <Avatar className="h-24 w-24 rounded-2xl border-2 border-background shadow-md shrink-0">
                    {trainer.image_url ? (
                      <AvatarImage src={trainer.image_url} alt="" />
                    ) : null}
                    <AvatarFallback className="rounded-2xl bg-primary/15 text-primary text-2xl font-semibold">
                      {initials(trainer.first_name, trainer.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                        {trainer.first_name} {trainer.last_name}
                      </h1>
                      {trainer.persona_stale && p ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 text-amber-700 dark:text-amber-400 gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Persona out of date
                        </Badge>
                      ) : null}
                      {!p ? (
                        <Badge variant="secondary">No persona yet</Badge>
                      ) : !trainer.persona_stale ? (
                        <Badge className="gap-1 bg-emerald-600/90 hover:bg-emerald-600">
                          <Sparkles className="h-3 w-3" />
                          Persona ready
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground">{trainer.title}</p>
                    {trainer.email ? (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0 opacity-70" />
                        {trainer.email}
                      </p>
                    ) : null}
                    {trainer.persona_generated_at ? (
                      <p className="text-xs text-muted-foreground">
                        Persona generated{' '}
                        {new Date(
                          trainer.persona_generated_at
                        ).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    onClick={() => void runGenerate()}
                    disabled={generating}
                    className="gap-2"
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {p ? 'Regenerate persona' : 'Generate persona'}
                  </Button>
                  <Button variant="outline" className="gap-2" asChild>
                    <Link href={`/trainers?edit=${trainer.id}`}>
                      <Pencil className="h-4 w-4" />
                      Edit details
                    </Link>
                  </Button>
                </div>
              </div>
              {genError ? (
                <p className="relative mt-4 text-sm text-destructive">
                  {genError}
                </p>
              ) : null}
              {trainer.persona_stale && p ? (
                <p className="relative mt-4 text-sm text-amber-800 dark:text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  Raw coaching text changed since this persona was generated.
                  Regenerate to align AI recommendations with your latest notes.
                </p>
              ) : null}
            </div>

            {!p ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Build a structured persona
                  </CardTitle>
                  <CardDescription>
                    We&apos;ll read your free-form notes and produce a
                    consistent coaching profile—pillars, client fit, and
                    instructions for program generation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => void runGenerate()}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate from raw text
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3 h-auto gap-1 p-1">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="full">Full profile</TabsTrigger>
                  <TabsTrigger value="ai">AI context</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardDescription className="text-xs uppercase tracking-wide">
                        Headline
                      </CardDescription>
                      <CardTitle className="text-xl leading-snug font-medium">
                        {p.coaching_headline}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground leading-relaxed">
                        {p.coaching_narrative}
                      </p>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-medium mb-3">
                          Programming pillars
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(p.programming_pillars ?? []).map((pillar) => (
                            <div
                              key={pillar.name}
                              className="rounded-xl border bg-card/50 p-4 shadow-sm"
                            >
                              <p className="font-medium text-sm">
                                {pillar.name}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                                {pillar.summary}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="full" className="mt-6 space-y-6">
                  <div className="grid gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Coaching story
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                        <p>
                          <span className="font-medium text-foreground">
                            Headline:{' '}
                          </span>
                          {p.coaching_headline}
                        </p>
                        <p>{p.coaching_narrative}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Progression & intensity
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                        <div>
                          <p className="font-medium text-foreground mb-1">
                            Progression philosophy
                          </p>
                          <p>{p.progression_philosophy}</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground mb-1">
                            Intensity & effort
                          </p>
                          <p>{p.intensity_and_effort_model}</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground mb-1">
                            Prehab & systems
                          </p>
                          <p>{p.prehab_and_systems_integration}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Clients</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {p.client_archetype_summary}
                        </p>
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Typical needs
                          </p>
                          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
                            {(p.ideal_client_needs ?? []).map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">
                            What they avoid
                          </p>
                          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
                            {(p.programming_anti_patterns ?? []).map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="ai" className="mt-6">
                  <Card className="border-primary/20 bg-muted/20">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Prompt injection block
                      </CardTitle>
                      <CardDescription>
                        This paragraph is written for downstream AI when
                        building programs. It encodes this coach&apos;s biases
                        and rules of thumb.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-foreground/90 rounded-xl bg-background/80 border p-4 max-h-[min(70vh,520px)] overflow-y-auto">
                        {p.ai_prompt_injection}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            <Collapsible open={rawOpen} onOpenChange={setRawOpen}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Original raw inputs
                      </CardTitle>
                      <CardDescription>
                        Verbatim text used to generate the persona. Edit these
                        from the trainer list or edit flow.
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
                      <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                        What defines them as a trainer
                      </h3>
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                        {trainer.raw_trainer_definition}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                        What defines their clients&apos; needs
                      </h3>
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                        {trainer.raw_client_needs}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
