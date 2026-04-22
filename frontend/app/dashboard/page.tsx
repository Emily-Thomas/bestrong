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
        description="Your coaching overview at a glance"
        action={
          <Button asChild size="sm">
            <Link href="/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Link>
          </Button>
        }
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clients
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary font-mono">
                {clients.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active profiles
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-20 rounded-md border border-dashed border-border bg-muted/50 flex items-center justify-center text-sm text-muted-foreground">
                Track program progress
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Milo's Plans</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-20 rounded-md border border-dashed border-border bg-muted/50 flex items-center justify-center text-sm text-muted-foreground">
                AI-generated programs
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Clients</CardTitle>
              <CardDescription>
                Your most recently added clients
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link href="/clients/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Milo's loading your clients...</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ready to add your first client?</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Start building personalized training programs with Milo's help
                </p>
                <Button asChild>
                  <Link href="/clients/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Client
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.slice(0, 10).map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:shadow-md hover:bg-accent/5 transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
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
                    <div className="text-sm text-muted-foreground font-mono">
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
