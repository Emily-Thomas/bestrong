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
        description="Manage your client roster"
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
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">
                Loading your clients...
              </p>
            </CardContent>
          </Card>
        ) : clients.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Ready to add your first client?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Start building personalized training programs with Milo's help
              </p>
              <Button asChild>
                <Link href="/clients/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Client
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">
                        Added
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {clients.map((client) => (
                      <tr
                        key={client.id}
                        onClick={() => router.push(`/clients/${client.id}`)}
                        className="hover:bg-accent/10 hover:shadow-sm transition-all cursor-pointer"
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
                                  'No contact info'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell whitespace-nowrap font-mono text-xs">
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
