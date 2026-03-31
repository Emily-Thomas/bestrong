'use client';

import { Loader2, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { type Client, clientsApi } from '@/lib/api';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClients = useCallback(async () => {
    const response = await clientsApi.getAll();
    if (response.success && response.data) {
      setClients(response.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return (
    <ProtectedRoute>
      <AppShell
        title="Clients"
        description="Open a client to view details and training"
        action={
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              Add New Client
            </Link>
          </Button>
        }
      >
        {loading ? (
          <Card className="border-border/60">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : clients.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No clients yet.</p>
              <Button asChild>
                <Link href="/clients/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first client
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60">
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-muted/20 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">
                        Added
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {clients.map((client) => (
                      <tr
                        key={client.id}
                        onClick={() => router.push(`/clients/${client.id}`)}
                        className="hover:bg-accent/40 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {client.first_name[0]}
                              {client.last_name[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium">
                                {client.first_name} {client.last_name}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {client.email ||
                                  client.phone ||
                                  'No email or phone'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell whitespace-nowrap">
                          {new Date(client.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
