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
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  type Client,
  clientsApi,
  type Questionnaire,
  questionnairesApi,
  type Recommendation,
  recommendationsApi,
} from '@/lib/api';
import { ClientInformationSection } from './components/ClientInformationSection';
import { InBodyScansSection } from './components/InBodyScansSection';
import { QuestionnaireSection } from './components/QuestionnaireSection';
import { TrainingPlansSection } from './components/TrainingPlansSection';
import { WorkoutsSection } from './components/WorkoutsSection';

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
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    const [clientRes, questionnaireRes] = await Promise.all([
      clientsApi.getById(clientId),
      questionnairesApi.getByClientId(clientId),
    ]);

    if (clientRes.success && clientRes.data) {
      setClient(clientRes.data);
    }
    if (questionnaireRes.success && questionnaireRes.data) {
      const q = questionnaireRes.data;
      setQuestionnaire(q);

      // Note: We'll check for existing jobs in a useEffect after questionnaire is set
      // This avoids circular dependency issues

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

  const handleDelete = async () => {
    setDeleting(true);

    const response = await clientsApi.delete(clientId);
    if (response.success) {
      router.push('/clients');
    } else {
      // Error handling - could show a toast notification here
      setDeleting(false);
    }
  };

  const handleClientUpdate = (updatedClient: Client) => {
    setClient(updatedClient);
  };

  const handleRecommendationUpdate = (updatedRecommendation: Recommendation | null) => {
    setRecommendation(updatedRecommendation);
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
            <ClientInformationSection
              client={client}
              recommendation={recommendation}
              onClientUpdate={handleClientUpdate}
              onRecommendationUpdate={handleRecommendationUpdate}
            />

            <InBodyScansSection clientId={clientId} />

            <QuestionnaireSection
              clientId={clientId}
              questionnaire={questionnaire}
            />

            <TrainingPlansSection
              clientId={clientId}
              questionnaire={questionnaire}
              recommendation={recommendation}
              onRecommendationUpdate={handleRecommendationUpdate}
            />

            <WorkoutsSection
              clientId={clientId}
              recommendation={recommendation}
            />
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
