'use client';

import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  type Client,
  clientsApi,
  inbodyScansApi,
  type Questionnaire,
  questionnairesApi,
  type Recommendation,
  recommendationsApi,
} from '@/lib/api';
import { ClientDetailTabs } from './components/ClientDetailTabs';
import { ClientInformationSection } from './components/ClientInformationSection';
import { ClientSetupWorkspace } from './components/ClientSetupWorkspace';

function ClientDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = Number(params.id);

  const [client, setClient] = useState<Client | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(
    null
  );
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null
  );
  const [hasScan, setHasScan] = useState<boolean | null>(null);
  const [hasVerifiedScan, setHasVerifiedScan] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const showWelcomeBanner = searchParams.get('onboarding') === '1';

  const loadData = useCallback(async () => {
    const [clientRes, questionnaireRes, scanRes, scansListRes] =
      await Promise.all([
        clientsApi.getById(clientId),
        questionnairesApi.getByClientId(clientId),
        inbodyScansApi.hasScan(clientId),
        inbodyScansApi.getByClientId(clientId),
      ]);

    if (clientRes.success && clientRes.data) {
      setClient(clientRes.data);
    }

    const listVerified =
      scansListRes.success &&
      Boolean(scansListRes.data?.some((s) => s.verified === true));
    const apiVerified =
      scanRes.success && scanRes.data
        ? scanRes.data.has_verified_scan === true
        : false;

    if (scanRes.success && scanRes.data) {
      setHasScan(scanRes.data.has_scan);
      setHasVerifiedScan(apiVerified || listVerified);
    } else if (scansListRes.success && scansListRes.data) {
      setHasScan(scansListRes.data.length > 0);
      setHasVerifiedScan(listVerified);
    } else {
      setHasScan(false);
      setHasVerifiedScan(false);
    }

    if (questionnaireRes.success && questionnaireRes.data) {
      const q = questionnaireRes.data;
      setQuestionnaire(q);

      try {
        const recResponse = await recommendationsApi.getByQuestionnaireId(q.id);
        if (recResponse.success && recResponse.data) {
          setRecommendation(recResponse.data);
        } else {
          const allRecsResponse =
            await recommendationsApi.getByClientId(clientId);
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
      } catch (_err) {
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
      void loadData();
    }
  }, [clientId, loadData]);

  const setupComplete =
    Boolean(questionnaire) &&
    hasVerifiedScan === true &&
    Boolean(recommendation);

  useEffect(() => {
    if (!setupComplete || !showWelcomeBanner) return;
    router.replace(`/clients/${clientId}?tab=overview`, { scroll: false });
  }, [setupComplete, showWelcomeBanner, clientId, router]);

  const dismissWelcome = useCallback(() => {
    router.replace(`/clients/${clientId}`, { scroll: false });
  }, [router, clientId]);

  const handleDelete = async () => {
    setDeleting(true);

    const response = await clientsApi.delete(clientId);
    if (response.success) {
      router.push('/clients');
    } else {
      setDeleting(false);
    }
  };

  const handleClientUpdate = (updatedClient: Client) => {
    setClient(updatedClient);
  };

  const handleRecommendationUpdate = (
    updatedRecommendation: Recommendation | null
  ) => {
    setRecommendation(updatedRecommendation);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Client" description="Getting their profile ready">
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading client...
              </p>
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!client) {
    return (
      <ProtectedRoute>
        <AppShell
          title="Client"
          description="We couldn't find that profile"
        >
          <Card className="max-w-md shadow-md">
            <CardContent className="text-center text-muted-foreground py-12">
              Client not found. They may have been removed or the link is wrong.
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
        description={
          setupComplete
            ? 'Intake → coach & plan → workouts'
            : 'Finish intake, then coach & plan — workouts come after the plan is locked'
        }
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
        <div className="mx-auto w-full max-w-4xl space-y-8">
          {!setupComplete ? (
            <>
              <ClientInformationSection
                client={client}
                recommendation={recommendation}
                onClientUpdate={handleClientUpdate}
                onRecommendationUpdate={handleRecommendationUpdate}
              />
              <ClientSetupWorkspace
                clientId={clientId}
                questionnaire={questionnaire}
                recommendation={recommendation}
                hasScan={hasScan}
                hasVerifiedScan={hasVerifiedScan}
                onRefresh={loadData}
                onRecommendationUpdate={handleRecommendationUpdate}
                showWelcomeBanner={showWelcomeBanner}
                onDismissWelcome={dismissWelcome}
              />
            </>
          ) : (
            <ClientDetailTabs
              clientId={clientId}
              client={client}
              questionnaire={questionnaire}
              recommendation={recommendation}
              onRefresh={loadData}
              onClientUpdate={handleClientUpdate}
              onRecommendationUpdate={handleRecommendationUpdate}
            />
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function ClientDetailPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute>
          <AppShell title="Client" description="Getting their profile ready">
            <Card className="shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          </AppShell>
        </ProtectedRoute>
      }
    >
      <ClientDetailInner />
    </Suspense>
  );
}
