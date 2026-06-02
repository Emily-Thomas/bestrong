'use client';

import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { ImportProgramSetup } from './components/ImportProgramSetup';
import {
  clearImportedProgramSession,
  importedProgramClientUrl,
  markImportedProgramClient,
  resolveImportedProgramClient,
} from '@/lib/client-onboarding';

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
  const [loadError, setLoadError] = useState('');
  const [intakeWarning, setIntakeWarning] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [hasWorkouts, setHasWorkouts] = useState(false);
  const [importedBuilderProgress, setImportedBuilderProgress] = useState({
    ready: 0,
    total: 0,
  });

  const showWelcomeBanner = searchParams.get('onboarding') === '1';
  const hasLoadedRef = useRef(false);
  const lastClientIdRef = useRef<number | null>(null);

  const loadData = useCallback(async () => {
    if (lastClientIdRef.current !== clientId) {
      lastClientIdRef.current = clientId;
      hasLoadedRef.current = false;
    }

    setLoadError('');
    setIntakeWarning('');

    if (!Number.isFinite(clientId) || clientId <= 0) {
      setClient(null);
      setLoading(false);
      setLoadError('This client link is invalid.');
      return;
    }

    if (!hasLoadedRef.current) {
      setLoading(true);
    }

    const [clientRes, questionnaireRes, scanRes, scansListRes] =
      await Promise.all([
        clientsApi.getById(clientId),
        questionnairesApi.getByClientId(clientId),
        inbodyScansApi.hasScan(clientId),
        inbodyScansApi.getByClientId(clientId),
      ]);

    if (clientRes.success && clientRes.data) {
      setClient(clientRes.data);
      const skipIntakeWarnings = resolveImportedProgramClient(
        clientRes.data,
        { clientId, searchParams }
      );
      const missing: string[] = [];
      if (!skipIntakeWarnings && !questionnaireRes.success) {
        missing.push('questionnaire');
      }
      if (!skipIntakeWarnings && !scanRes.success && !scansListRes.success) {
        missing.push('InBody');
      }
      setIntakeWarning(
        missing.length > 0
          ? `We could not refresh ${missing.join(' and ')} data. Open the matching tab or refresh to try again.`
          : ''
      );
    } else {
      setClient(null);
      setIntakeWarning('');
      if (!clientRes.success) {
        setLoadError(
          clientRes.error ||
            'We could not load this client. Try again in a moment.'
        );
      }
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
          setRecommendation((prev) =>
            prev?.id === recResponse.data?.id ? prev : recResponse.data ?? null
          );
        } else {
          const allRecsResponse =
            await recommendationsApi.getByClientId(clientId);
          if (allRecsResponse.success && allRecsResponse.data) {
            const matchingRec = allRecsResponse.data.find(
              (rec) => rec.questionnaire_id === q.id
            );
            setRecommendation((prev) =>
              prev?.id === matchingRec?.id ? prev : matchingRec ?? null
            );
          } else {
            setRecommendation((prev) => (prev === null ? prev : null));
          }
        }
      } catch (_err) {
        setRecommendation((prev) => (prev === null ? prev : null));
      }
    } else {
      setQuestionnaire(null);
      setRecommendation((prev) => (prev === null ? prev : null));
    }
    hasLoadedRef.current = true;
    setLoading(false);
  }, [clientId, searchParams]);

  useEffect(() => {
    if (clientId) {
      void loadData();
    }
  }, [clientId, loadData]);

  const importedProgram = resolveImportedProgramClient(client, {
    clientId,
    searchParams,
  });

  useEffect(() => {
    if (!recommendation?.id) {
      setHasWorkouts(false);
      return;
    }
    if (importedProgram) {
      return;
    }
    let cancelled = false;
    void recommendationsApi.getWorkouts(recommendation.id).then((res) => {
      if (!cancelled) {
        setHasWorkouts(Boolean(res.success && res.data && res.data.length > 0));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [recommendation?.id, importedProgram]);
  const setupComplete = importedProgram
    ? Boolean(recommendation)
    : Boolean(questionnaire) &&
      hasVerifiedScan === true &&
      Boolean(recommendation);

  useEffect(() => {
    if (!client || !importedProgram) return;
    if (client.onboarding_track === 'imported_program') return;

    void clientsApi
      .update(clientId, { onboarding_track: 'imported_program' })
      .then((res) => {
        if (res.success && res.data) {
          setClient(res.data);
        }
      });
  }, [client, importedProgram, clientId]);

  useEffect(() => {
    if (!importedProgram || setupComplete) return;
    const hasImportedParam = searchParams.get('imported') === '1';
    if (hasImportedParam) return;
    router.replace(importedProgramClientUrl(clientId), { scroll: false });
  }, [importedProgram, setupComplete, clientId, router, searchParams]);

  useEffect(() => {
    if (!setupComplete || !showWelcomeBanner) return;
    router.replace(
      importedProgram
        ? importedProgramClientUrl(clientId)
        : `/clients/${clientId}?tab=overview`,
      { scroll: false }
    );
  }, [setupComplete, showWelcomeBanner, clientId, router, importedProgram]);

  const dismissWelcome = useCallback(() => {
    router.replace(
      importedProgram
        ? importedProgramClientUrl(clientId)
        : `/clients/${clientId}`,
      { scroll: false }
    );
  }, [router, clientId, importedProgram]);

  const handleDelete = async () => {
    setDeleteError('');
    setDeleting(true);

    const response = await clientsApi.delete(clientId);
    if (response.success) {
      router.push('/clients');
    } else {
      setDeleteError(
        response.error ||
          'We could not delete this client. Try again or contact support if it keeps failing.'
      );
      setDeleting(false);
    }
  };

  const handleClientUpdate = useCallback((updatedClient: Client) => {
    setClient(updatedClient);
  }, []);

  const handleRecommendationUpdate = useCallback(
    (updatedRecommendation: Recommendation | null) => {
      setRecommendation((prev) => {
        if (prev?.id === updatedRecommendation?.id) {
          return prev;
        }
        return updatedRecommendation;
      });
    },
    []
  );

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Client" description="Getting their profile ready">
          <div
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 shadow-sm"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2
              className="mb-3 h-8 w-8 animate-spin text-primary"
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">
              Scout&apos;s loading this profile...
            </p>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (loadError) {
    return (
      <ProtectedRoute>
        <AppShell
          title="Client"
          description="We could not open this profile"
          backAction={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/clients">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Clients
              </Link>
            </Button>
          }
        >
          <Alert variant="destructive" className="max-w-lg" role="alert">
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-destructive/30 bg-background"
                onClick={() => void loadData()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!client) {
    return (
      <ProtectedRoute>
        <AppShell
          title="Client"
          description="We could not find that profile"
          backAction={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/clients">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Clients
              </Link>
            </Button>
          }
        >
          <div className="max-w-md rounded-xl border border-border bg-card px-6 py-12 text-center text-muted-foreground shadow-sm">
            Client not found. They may have been removed or the link is wrong.
          </div>
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
            ? importedProgram
              ? 'Build program is your home tab for this client.'
              : 'Use the tabs for overview, intake, scans, coach and plan, and workouts.'
            : importedProgram
              ? 'Set how many weeks and sessions you need, then start adding exercises.'
              : 'Finish intake and verify InBody, then set coach and plan before scheduling workouts.'
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
              {deleteError ? (
                <p className="text-sm text-destructive" role="alert">
                  {deleteError}
                </p>
              ) : null}
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
          {intakeWarning ? (
            <Alert variant="warning" role="status">
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{intakeWarning}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => void loadData()}
                >
                  Refresh profile
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {!setupComplete ? (
            <>
              <ClientInformationSection
                client={client}
                recommendation={recommendation}
                onClientUpdate={handleClientUpdate}
                onRecommendationUpdate={handleRecommendationUpdate}
              />
              {!importedProgram && !recommendation && !questionnaire ? (
                <Alert>
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Porting a program from another tool? Skip intake and build
                      sessions by hand.
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={async () => {
                        markImportedProgramClient(clientId);
                        const res = await clientsApi.update(clientId, {
                          onboarding_track: 'imported_program',
                        });
                        if (res.success && res.data) {
                          handleClientUpdate(res.data);
                        }
                        router.replace(importedProgramClientUrl(clientId), {
                          scroll: false,
                        });
                      }}
                    >
                      Use imported-program setup
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
              {importedProgram ? (
                <ImportProgramSetup
                  clientId={clientId}
                  clientName={`${client.first_name} ${client.last_name}`}
                  onComplete={async () => {
                    clearImportedProgramSession(clientId);
                    await loadData();
                  }}
                />
              ) : (
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
              )}
            </>
          ) : (
            <ClientDetailTabs
              clientId={clientId}
              client={client}
              questionnaire={questionnaire}
              recommendation={recommendation}
              hasVerifiedScan={hasVerifiedScan === true}
              hasWorkouts={hasWorkouts}
              importedProgram={importedProgram}
              importedBuilderProgress={importedBuilderProgress}
              onWorkoutsPresenceChange={setHasWorkouts}
              onImportedBuilderProgressChange={setImportedBuilderProgress}
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
            <div
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 shadow-sm"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2
                className="mb-3 h-8 w-8 animate-spin text-primary"
                aria-hidden
              />
              <p className="text-sm text-muted-foreground">
                Scout&apos;s loading this profile...
              </p>
            </div>
          </AppShell>
        </ProtectedRoute>
      }
    >
      <ClientDetailInner />
    </Suspense>
  );
}
