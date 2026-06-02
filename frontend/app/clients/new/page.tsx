'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  type ClientOnboardingTrack,
  type CreateClientInput,
  clientsApi,
} from '@/lib/api';
import {
  importedProgramClientUrl,
  markImportedProgramClient,
} from '@/lib/client-onboarding';
import { cn } from '@/lib/utils';

type AddClientPath = ClientOnboardingTrack;

export default function NewClientPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [path, setPath] = useState<AddClientPath>('standard');
  const [formData, setFormData] = useState<CreateClientInput>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runCreate = async () => {
    setError('');
    setLoading(true);

    const response = await clientsApi.create({
      ...formData,
      onboarding_track: path,
    });
    if (response.success && response.data) {
      const id = response.data.id;
      if (path === 'imported_program') {
        markImportedProgramClient(id);
        router.push(importedProgramClientUrl(id));
      } else {
        router.push(`/clients/${id}?onboarding=1`);
      }
    } else {
      setError(response.error || 'Failed to create client');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runCreate();
  };

  return (
    <ProtectedRoute>
      <AppShell
        title="Add client"
        description={
          path === 'imported_program'
            ? 'Save their profile, then scaffold sessions for a program you are porting in'
            : 'Start a profile so you can run intake, scans, and AI-assisted planning'
        }
      >
        <div className="flex justify-center">
          <div className="w-full max-w-3xl space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">How are you adding them?</CardTitle>
                <CardDescription>
                  Pick the path that matches where this client is in their journey.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={path}
                  onValueChange={(v) => setPath(v as AddClientPath)}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <label
                    htmlFor="path-standard"
                    className={cn(
                      'flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-colors',
                      path === 'standard'
                        ? 'border-primary/40 bg-primary/[0.06] ring-1 ring-primary/25'
                        : 'border-border hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value="standard"
                        id="path-standard"
                        className="shrink-0"
                      />
                      <span className="font-medium text-foreground">
                        New to Scout
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      Questionnaire, InBody, coach fit, and AI or library plans.
                    </p>
                  </label>
                  <label
                    htmlFor="path-imported"
                    className={cn(
                      'flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-colors',
                      path === 'imported_program'
                        ? 'border-primary/40 bg-primary/[0.06] ring-1 ring-primary/25'
                        : 'border-border hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value="imported_program"
                        id="path-imported"
                        className="shrink-0"
                      />
                      <span className="font-medium text-foreground">
                        Existing program (off-platform)
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      Skip intake and scans. Create empty sessions and fill them
                      in by hand.
                    </p>
                  </label>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Client information</CardTitle>
                <CardDescription>
                  {path === 'imported_program'
                    ? 'Name and contact are enough to get started. You will set weeks and sessions on the next screen.'
                    : 'Save the basics, then Scout will walk you through intake on their profile.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  ref={formRef}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  {error && (
                    <Alert
                      variant="destructive"
                      className="border-destructive/50"
                    >
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">
                        First Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="first_name"
                        required
                        value={formData.first_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            first_name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last_name">
                        Last Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="last_name"
                        required
                        value={formData.last_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            last_name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            date_of_birth: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : path === 'imported_program' ? (
                        'Save and build program'
                      ) : (
                        'Save and open intake'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
