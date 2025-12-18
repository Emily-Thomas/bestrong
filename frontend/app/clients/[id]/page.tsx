'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Edit, FileText, Loader2, Save, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import {
  type Client,
  clientsApi,
  type Questionnaire,
  questionnairesApi,
  type Recommendation,
  recommendationsApi,
} from '@/lib/api';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);

  const [client, setClient] = useState<Client | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(
    null
  );
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
  });

  const loadData = useCallback(async () => {
    const [clientRes, questionnaireRes] = await Promise.all([
      clientsApi.getById(clientId),
      questionnairesApi.getByClientId(clientId),
    ]);

    if (clientRes.success && clientRes.data) {
      setClient(clientRes.data);
      setFormData({
        first_name: clientRes.data.first_name,
        last_name: clientRes.data.last_name,
        email: clientRes.data.email || '',
        phone: clientRes.data.phone || '',
        date_of_birth: clientRes.data.date_of_birth
          ? new Date(clientRes.data.date_of_birth).toISOString().split('T')[0]
          : '',
      });
    }
    if (questionnaireRes.success && questionnaireRes.data) {
      const q = questionnaireRes.data;
      setQuestionnaire(q);

      // Get recommendation for this questionnaire (1:1 relationship)
      try {
        const recResponse =
          await recommendationsApi.getByQuestionnaireId(q.id);
        if (recResponse.success && recResponse.data) {
          setRecommendation(recResponse.data);
        } else {
          // 404 is expected if no recommendation exists yet
          // Try fallback: get all recommendations for client and find matching one
          const allRecsResponse = await recommendationsApi.getByClientId(clientId);
          if (allRecsResponse.success && allRecsResponse.data) {
            const matchingRec = allRecsResponse.data.find(
              (rec) => rec.questionnaire_id === q.id
            );
            if (matchingRec) {
              setRecommendation(matchingRec);
            } else {
              setRecommendation(null);
            }
          } else {
            setRecommendation(null);
          }
        }
      } catch (err) {
        console.error('Error loading recommendation:', err);
        setRecommendation(null);
      }
    } else {
      setQuestionnaire(null);
      setRecommendation(null);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId, loadData]);

  const handleGenerateRecommendation = async () => {
    if (!questionnaire) {
      router.push(`/clients/${clientId}/questionnaire`);
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const response = await recommendationsApi.generateFromQuestionnaire(
        questionnaire.id
      );
      if (response.success && response.data) {
        setRecommendation(response.data);
        // Reload data to ensure everything is in sync
        await loadData();
      } else {
        setError(response.error || 'Failed to generate training plan');
      }
    } catch (err) {
      console.error('Error generating recommendation:', err);
      setError('Failed to generate training plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);

    const response = await clientsApi.update(clientId, formData);
    if (response.success && response.data) {
      setClient(response.data);
      setEditing(false);
    } else {
      setError(response.error || 'Failed to update client');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setError('');
    setDeleting(true);

    const response = await clientsApi.delete(clientId);
    if (response.success) {
      router.push('/clients');
    } else {
      setError(response.error || 'Failed to delete client');
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    if (client) {
      setFormData({
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email || '',
        phone: client.phone || '',
        date_of_birth: client.date_of_birth
          ? new Date(client.date_of_birth).toISOString().split('T')[0]
          : '',
      });
    }
    setEditing(false);
    setError('');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Client" description="Loading client details">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!client) {
    return (
      <ProtectedRoute>
        <AppShell title="Client" description="Client not found">
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              Client not found
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell
        title={`${client.first_name} ${client.last_name}`}
        description="Client overview"
        backAction={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Link>
          </Button>
        }
        action={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Client
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete{' '}
                  <strong>
                    {client.first_name} {client.last_name}
                  </strong>
                  ? This action cannot be undone and will also delete all
                  associated questionnaires and recommendations.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Client'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Client Information</CardTitle>
                  <CardDescription>Contact and basics</CardDescription>
                </div>
                {!editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {editing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSave();
                    }}
                    className="space-y-6"
                  >
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
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <dl className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground mb-1">
                        First Name
                      </dt>
                      <dd className="text-sm">{client.first_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground mb-1">
                        Last Name
                      </dt>
                      <dd className="text-sm">{client.last_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground mb-1">
                        Email
                      </dt>
                      <dd className="text-sm">
                        {client.email || 'Not provided'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground mb-1">
                        Phone
                      </dt>
                      <dd className="text-sm">
                        {client.phone || 'Not provided'}
                      </dd>
                    </div>
                    {client.date_of_birth && (
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground mb-1">
                          Date of Birth
                        </dt>
                        <dd className="text-sm">
                          {new Date(client.date_of_birth).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Questionnaire</CardTitle>
                  <CardDescription>Goals and preferences</CardDescription>
                </div>
                {questionnaire ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/clients/${clientId}/questionnaire`}>
                      <FileText className="mr-2 h-4 w-4" />
                      View/Edit
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" asChild>
                    <Link href={`/clients/${clientId}/questionnaire`}>
                      Fill Out Questionnaire
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {questionnaire ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                    {!questionnaire.notes && (
                      <>
                        <div>
                          <span className="font-medium">Primary Goal:</span>{' '}
                          {questionnaire.primary_goal || 'Not specified'}
                        </div>
                        <div>
                          <span className="font-medium">Experience Level:</span>{' '}
                          {questionnaire.experience_level || 'Not specified'}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No questionnaire filled out yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Training Plans</CardTitle>
                  <CardDescription>
                    AI-generated and customized recommendations
                  </CardDescription>
                </div>
                {questionnaire && (
                  <Button
                    size="sm"
                    onClick={handleGenerateRecommendation}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {recommendation ? 'Regenerate Plan' : 'Generate Plan'}
                      </>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {!recommendation ? (
                  <p className="text-sm text-muted-foreground">
                    No training plan yet.{' '}
                    {questionnaire
                      ? 'Generate one to get started.'
                      : 'Fill out the questionnaire first.'}
                  </p>
                ) : (
                  <Link
                    href={`/clients/${clientId}/recommendations/${recommendation.id}`}
                  >
                    <Card className="transition-colors cursor-pointer hover:bg-muted">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">
                              {recommendation.client_type}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {recommendation.sessions_per_week} sessions/week •{' '}
                              {recommendation.session_length_minutes} min/session
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {recommendation.training_style}
                            </p>
                          </div>
                          <Badge>{recommendation.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
