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
import { type CreateClientInput, clientsApi } from '@/lib/api';

export default function NewClientPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<CreateClientInput>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runCreate = async (skipSetupChecklist: boolean) => {
    setError('');
    setLoading(true);

    const response = await clientsApi.create(formData);
    if (response.success && response.data) {
      const id = response.data.id;
      router.push(
        skipSetupChecklist ? `/clients/${id}` : `/clients/${id}?onboarding=1`
      );
    } else {
      setError(response.error || 'Failed to create client');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runCreate(false);
  };

  const handleCreateWithoutChecklist = () => {
    const form = formRef.current;
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    void runCreate(true);
  };

  return (
    <ProtectedRoute>
      <AppShell
        title="Add client"
        description="Start a profile so you can add intake, scans, and programs in one place"
      >
        <div className="flex justify-center">
          <div className="w-full max-w-3xl">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Client information</CardTitle>
                <CardDescription>
                  Save the basics first. You can use the setup checklist on
                  their profile, or skip straight to the record.
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={loading}
                        onClick={handleCreateWithoutChecklist}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create without checklist'
                        )}
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create and open setup'
                        )}
                      </Button>
                    </div>
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
