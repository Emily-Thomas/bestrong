'use client';

import { ArrowDownAZ, Loader2, Plus, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
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
import { type Client, clientsApi } from '@/lib/api';
import { personInitials } from '@/lib/utils';

type SortKey = 'name-asc' | 'name-desc' | 'added-desc' | 'added-asc';

function clientDisplayName(client: Client) {
  return `${client.first_name} ${client.last_name}`.trim();
}

function clientSearchHaystack(client: Client) {
  return [
    client.first_name,
    client.last_name,
    client.email,
    client.phone,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('added-desc');

  const loadClients = useCallback(async () => {
    setLoadError('');
    if (clients.length === 0) {
      setLoading(true);
    }

    const response = await clientsApi.getAll();
    if (response.success && response.data) {
      setClients(response.data);
    } else {
      setClients([]);
      setLoadError(
        response.error || 'We could not load your roster. Try again in a moment.'
      );
    }
    setLoading(false);
  }, [clients.length]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (
      q ? clients.filter((c) => clientSearchHaystack(c).includes(q)) : [...clients]
    );

    list.sort((a, b) => {
      switch (sort) {
        case 'name-asc':
          return clientDisplayName(a).localeCompare(clientDisplayName(b));
        case 'name-desc':
          return clientDisplayName(b).localeCompare(clientDisplayName(a));
        case 'added-asc':
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case 'added-desc':
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return list;
  }, [clients, query, sort]);

  const showEmptyRoster = !loading && !loadError && clients.length === 0;
  const showNoMatches =
    !loading && !loadError && clients.length > 0 && filteredSorted.length === 0;

  const pageDescription = useMemo(() => {
    if (loading) {
      return 'Search your roster, open a profile, or add someone new.';
    }
    if (loadError) {
      return 'We could not load your roster.';
    }
    if (clients.length === 0) {
      return 'Add your first client to start intake and programming.';
    }
    const n = clients.length;
    const label = n === 1 ? '1 client' : `${n} clients`;
    return `${label} on your roster. Search, open a profile, or add someone new.`;
  }, [loading, loadError, clients.length]);

  return (
    <ProtectedRoute>
      <AppShell
        title="Clients"
        description={pageDescription}
        action={
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
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
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Scout&apos;s pulling up your roster...
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
                onClick={() => void loadClients()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : showEmptyRoster ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">
              Ready to add your first client?
            </h3>
            <p className="mx-auto max-w-sm text-muted-foreground">
              Start building personalized training programs with Scout&apos;s help.
              Use <span className="font-medium text-foreground">Add Client</span>{' '}
              above when you are ready.
            </p>
          </div>
        ) : (
          <section
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            aria-label="Client roster"
          >
            <div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="client-search" className="text-xs">
                  Search clients
                </Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="client-search"
                    type="search"
                    placeholder="Name, email, or phone"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:w-52">
                <ArrowDownAZ
                  className="hidden h-4 w-4 text-muted-foreground sm:block"
                  aria-hidden
                />
                <div className="w-full space-y-1.5">
                  <Label htmlFor="client-sort" className="text-xs sm:sr-only">
                    Sort roster
                  </Label>
                  <Select
                    value={sort}
                    onValueChange={(v) => setSort(v as SortKey)}
                  >
                    <SelectTrigger id="client-sort" className="w-full">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="added-desc">Newest first</SelectItem>
                      <SelectItem value="added-asc">Oldest first</SelectItem>
                      <SelectItem value="name-asc">Name (A–Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z–A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {showNoMatches ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                No clients match &ldquo;{query.trim()}&rdquo;.{' '}
                <button
                  type="button"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
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
                        Client
                      </th>
                      <th
                        scope="col"
                        className="hidden px-4 py-3 font-medium sm:table-cell sm:text-right"
                      >
                        Added
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSorted.map((client) => {
                      const profileHref = `/clients/${client.id}`;
                      const addedLabel = new Date(
                        client.created_at
                      ).toLocaleDateString();
                      return (
                        <tr key={client.id} className="group">
                          <td className="p-0 align-middle">
                            <Link
                              href={profileHref}
                              className="flex min-h-11 min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {personInitials(
                                  client.first_name,
                                  client.last_name
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium">
                                  {client.first_name} {client.last_name}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {client.email ||
                                    client.phone ||
                                    'No contact info'}
                                </div>
                                <div className="mt-0.5 font-mono text-xs text-muted-foreground sm:hidden">
                                  Added {addedLabel}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="hidden p-0 align-middle sm:table-cell">
                            <Link
                              href={profileHref}
                              className="flex min-h-11 items-center justify-end px-4 py-3 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            >
                              <span className="sr-only">
                                {client.first_name} {client.last_name},{' '}
                              </span>
                              {addedLabel}
                            </Link>
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
