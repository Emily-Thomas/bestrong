'use client';

import { Loader2, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { type Client, clientsApi } from '@/lib/api';

export default function DashboardPage() {
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
        title="Dashboard"
        description="Overview of your clients and their training plans"
        action={
          <Button asChild size="sm">
            <Link href="/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Link>
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {clients.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active client profiles
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-20 rounded-md border border-dashed border-border bg-muted flex items-center justify-center text-sm text-muted-foreground">
                Add metrics like plans in progress.
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">AI Plans</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-20 rounded-md border border-dashed border-border bg-muted flex items-center justify-center text-sm text-muted-foreground">
                Track generated recommendations.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Clients</CardTitle>
              <CardDescription>Your most recently added clients</CardDescription>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link href="/clients/new">
                <Plus className="mr-2 h-4 w-4" />
                Add New Client
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No clients yet. Create your first client to get started.
                </p>
                <Button asChild>
                  <Link href="/clients/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first client
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.slice(0, 10).map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {client.first_name[0]}
                        {client.last_name[0]}
                      </div>
                      <div>
                        <div className="font-medium">
                          {client.first_name} {client.last_name}
                        </div>
                        {client.email && (
                          <div className="text-sm text-muted-foreground">
                            {client.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(client.created_at).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </AppShell>
    </ProtectedRoute>
  );
}
