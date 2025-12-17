'use client';

import { ArrowLeft, FileText, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async () => {
    const [clientRes, questionnaireRes, recommendationsRes] = await Promise.all(
      [
        clientsApi.getById(clientId),
        questionnairesApi.getByClientId(clientId),
        recommendationsApi.getByClientId(clientId),
      ]
    );

    if (clientRes.success && clientRes.data) {
      setClient(clientRes.data);
    }
    if (questionnaireRes.success && questionnaireRes.data) {
      setQuestionnaire(questionnaireRes.data);
    }
    if (recommendationsRes.success && recommendationsRes.data) {
      setRecommendations(recommendationsRes.data);
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
    const response = await recommendationsApi.generateFromQuestionnaire(
      questionnaire.id
    );
    if (response.success) {
      loadData();
    }
    setGenerating(false);
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
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Link>
          </Button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
                <CardDescription>Contact and basics</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-6 sm:grid-cols-2">
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
                        Generate New Plan
                      </>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {recommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No recommendations yet.{' '}
                    {questionnaire
                      ? 'Generate one to get started.'
                      : 'Fill out the questionnaire first.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((rec) => (
                      <Link
                        key={rec.id}
                        href={`/clients/${clientId}/recommendations/${rec.id}`}
                      >
                    <Card className="transition-colors cursor-pointer hover:bg-muted">
                      <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold mb-1">
                                  {rec.client_type}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {rec.sessions_per_week} sessions/week •{' '}
                                  {rec.session_length_minutes} min/session
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {rec.training_style}
                                </p>
                              </div>
                              <Badge>
                                {rec.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
