'use client';

import { ArrowDownAZ, Loader2, Pencil, Plus, Search, UserSquare2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TrainerPersonaStatusBadge } from './components/TrainerPersonaStatusBadge';
import {
  trainerDisplayName,
  trainerInitials,
  trainerPersonaStatus,
  trainerSearchHaystack,
} from './lib/trainer-utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Trainer, trainersApi } from '@/lib/api';
import { touchActionClass } from '@/lib/touch-targets';
import { cn } from '@/lib/utils';

type SortKey =
  | 'name-asc'
  | 'name-desc'
  | 'persona-ready'
  | 'persona-draft'
  | 'updated-desc';

function sortTrainers(list: Trainer[], sort: SortKey): Trainer[] {
  const copy = [...list];
  copy.sort((a, b) => {
    switch (sort) {
      case 'name-desc':
        return trainerDisplayName(b).localeCompare(trainerDisplayName(a));
      case 'persona-ready': {
        const score = (t: Trainer) => {
          const s = trainerPersonaStatus(t);
          if (s === 'ready') return 0;
          if (s === 'stale') return 1;
          return 2;
        };
        const diff = score(a) - score(b);
        if (diff !== 0) return diff;
        return trainerDisplayName(a).localeCompare(trainerDisplayName(b));
      }
      case 'persona-draft': {
        const score = (t: Trainer) => (trainerPersonaStatus(t) === 'draft' ? 0 : 1);
        const diff = score(a) - score(b);
        if (diff !== 0) return diff;
        return trainerDisplayName(a).localeCompare(trainerDisplayName(b));
      }
      case 'updated-desc': {
        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return tb - ta;
      }
      case 'name-asc':
      default:
        return trainerDisplayName(a).localeCompare(trainerDisplayName(b));
    }
  });
  return copy;
}

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name-asc');

  const load = useCallback(async () => {
    setLoadError('');
    if (trainers.length === 0) {
      setLoading(true);
    }
    const res = await trainersApi.getAll();
    if (res.success && res.data) {
      setTrainers(res.data);
    } else {
      setTrainers([]);
      setLoadError(
        res.error || 'We could not load your trainers. Try again in a moment.'
      );
    }
    setLoading(false);
  }, [trainers.length]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? trainers.filter((t) => trainerSearchHaystack(t).includes(q))
      : [...trainers];
    return sortTrainers(list, sort);
  }, [trainers, query, sort]);

  const showEmptyRoster = !loading && !loadError && trainers.length === 0;
  const showNoMatches =
    !loading && !loadError && trainers.length > 0 && filteredSorted.length === 0;

  const pageDescription = useMemo(() => {
    if (loading) {
      return 'Search your team, open a profile, or add a coach.';
    }
    if (loadError) {
      return 'We could not load your trainers.';
    }
    if (trainers.length === 0) {
      return 'Add coaches so Scout can mirror their style in programs.';
    }
    const n = trainers.length;
    const label = n === 1 ? '1 trainer' : `${n} trainers`;
    return `${label} on your team. Persona status shows who is ready for AI programs.`;
  }, [loading, loadError, trainers.length]);

  return (
    <ProtectedRoute>
      <AppShell
        title="Trainers"
        description={pageDescription}
        action={
          <Button asChild>
            <Link href="/trainers/new">
              <Plus className="mr-2 h-4 w-4" />
              Add trainer
            </Link>
          </Button>
        }
      >
        {loading ? (
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
              Scout&apos;s pulling up your trainers…
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
        ) : showEmptyRoster ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <UserSquare2 className="h-8 w-8 text-primary" aria-hidden />
            </div>
            <h3 className="mb-2 text-lg font-semibold">
              Ready to add your first trainer?
            </h3>
            <p className="mx-auto max-w-sm text-muted-foreground">
              Coaching profiles help Scout understand each coach&apos;s style. Use{' '}
              <span className="font-medium text-foreground">Add trainer</span> when
              you are ready.
            </p>
          </div>
        ) : (
          <section
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            aria-label="Trainer roster"
          >
            <div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="trainer-search" className="text-xs">
                  Search trainers
                </Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="trainer-search"
                    type="search"
                    placeholder="Name, title, email, or headline"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:w-56">
                <ArrowDownAZ
                  className="hidden h-4 w-4 text-muted-foreground sm:block"
                  aria-hidden
                />
                <div className="w-full space-y-1.5">
                  <Label htmlFor="trainer-sort" className="text-xs sm:sr-only">
                    Sort roster
                  </Label>
                  <Select
                    value={sort}
                    onValueChange={(v) => setSort(v as SortKey)}
                  >
                    <SelectTrigger id="trainer-sort" className="w-full">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Name (A–Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z–A)</SelectItem>
                      <SelectItem value="persona-ready">
                        Ready for programs first
                      </SelectItem>
                      <SelectItem value="persona-draft">Drafts first</SelectItem>
                      <SelectItem value="updated-desc">Recently updated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Persona status:</span>{' '}
              <span className="font-medium text-foreground">Ready</span> = usable in
              AI programs;{' '}
              <span className="font-medium text-foreground">Draft</span> = add notes
              and generate;{' '}
              <span className="font-medium text-foreground">Stale</span> = raw notes
              changed since last run.
            </p>

            {showNoMatches ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                No trainers match &ldquo;{query.trim()}&rdquo;.{' '}
                <button
                  type="button"
                  className={cn(
                    'font-medium text-foreground underline-offset-4 hover:underline',
                    'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                  onClick={() => setQuery('')}
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Trainer
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Persona
                      </th>
                      <th
                        scope="col"
                        className="hidden px-4 py-3 font-medium md:table-cell"
                      >
                        Title
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium w-24">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSorted.map((t) => {
                      const profileHref = `/trainers/${t.id}`;
                      const status = trainerPersonaStatus(t);
                      return (
                        <tr
                          key={t.id}
                          className={cn(
                            'group',
                            status === 'stale' && 'bg-amber-500/[0.04]'
                          )}
                        >
                          <td className="p-0 align-middle">
                            <Link
                              href={profileHref}
                              className="flex min-h-11 min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {trainerInitials(t.first_name, t.last_name)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium">
                                  {t.first_name} {t.last_name}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {t.email || 'No email'}
                                </div>
                                <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground md:hidden">
                                  {t.title}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="p-0 align-middle">
                            <Link
                              href={profileHref}
                              className="flex min-h-11 items-center px-4 py-3 transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            >
                              <TrainerPersonaStatusBadge
                                status={status}
                                compact
                              />
                            </Link>
                          </td>
                          <td className="hidden p-0 align-middle md:table-cell">
                            <Link
                              href={profileHref}
                              className="flex min-h-11 items-center px-4 py-3 text-muted-foreground transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            >
                              <span className="line-clamp-2">{t.title}</span>
                            </Link>
                          </td>
                          <td className="p-0 align-middle">
                            <div className="flex min-h-11 items-center justify-end px-2 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1.5"
                                asChild
                              >
                                <Link
                                  href={`/trainers/new?edit=${t.id}`}
                                  className={touchActionClass}
                                  aria-label={`Edit ${t.first_name} ${t.last_name}`}
                                >
                                  <Pencil className="h-4 w-4" aria-hidden />
                                  <span className="hidden sm:inline">Edit</span>
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
