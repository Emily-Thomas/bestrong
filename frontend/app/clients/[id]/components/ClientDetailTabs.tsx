'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Client, Questionnaire, Recommendation } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ClientInformationSection } from './ClientInformationSection';
import { InBodyScansSection } from './InBodyScansSection';
import { QuestionnaireSection } from './QuestionnaireSection';
import { TrainingPlansSection } from './TrainingPlansSection';
import { WorkoutsSection } from './WorkoutsSection';

const TAB_VALUES = [
  'overview',
  'questionnaire',
  'inbody',
  'training',
  'workouts',
] as const;
type TabValue = (typeof TAB_VALUES)[number];

type TabAttention = 'complete' | 'attention' | 'neutral';

const TAB_ITEMS: { value: TabValue; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'questionnaire', label: 'Questionnaire' },
  { value: 'inbody', label: 'InBody' },
  { value: 'training', label: 'Coach & plan' },
  { value: 'workouts', label: 'Workouts' },
];

const IMPORTED_TAB_ITEMS: { value: TabValue; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'workouts', label: 'Build program' },
];

const IMPORTED_VISIBLE_TABS = new Set<TabValue>(['overview', 'workouts']);

function normalizeTab(
  raw: string | null,
  importedProgram: boolean
): TabValue {
  if (importedProgram) {
    if (raw === 'overview' || raw === 'workouts') return raw;
    return 'workouts';
  }
  if (raw && (TAB_VALUES as readonly string[]).includes(raw)) {
    return raw as TabValue;
  }
  return 'overview';
}

function tabAccessibleLabel(label: string, status: TabAttention): string {
  if (status === 'attention') return `${label}, needs attention`;
  if (status === 'complete') return `${label}, complete`;
  return label;
}

function TabStatusDot({ status }: { status: TabAttention }) {
  if (status === 'neutral') return null;
  return (
    <span
      className={cn(
        'h-1.5 w-1.5 shrink-0 rounded-full',
        status === 'complete' && 'bg-success',
        status === 'attention' && 'bg-warning'
      )}
      aria-hidden
    />
  );
}

function TabLabel({
  children,
  status,
}: {
  children: ReactNode;
  status: TabAttention;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      <TabStatusDot status={status} />
    </span>
  );
}

interface ClientDetailTabsProps {
  clientId: number;
  client: Client;
  questionnaire: Questionnaire | null;
  recommendation: Recommendation | null;
  hasVerifiedScan: boolean;
  hasWorkouts: boolean;
  importedProgram?: boolean;
  importedBuilderProgress?: { ready: number; total: number };
  onWorkoutsPresenceChange: (hasWorkouts: boolean) => void;
  onImportedBuilderProgressChange?: (progress: {
    ready: number;
    total: number;
  }) => void;
  onRefresh: () => void | Promise<void>;
  onClientUpdate: (client: Client) => void;
  onRecommendationUpdate: (recommendation: Recommendation | null) => void;
}

export function ClientDetailTabs({
  clientId,
  client,
  questionnaire,
  recommendation,
  hasVerifiedScan,
  hasWorkouts,
  importedProgram = false,
  importedBuilderProgress = { ready: 0, total: 0 },
  onWorkoutsPresenceChange,
  onImportedBuilderProgressChange,
  onRefresh,
  onClientUpdate,
  onRecommendationUpdate,
}: ClientDetailTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = normalizeTab(searchParams.get('tab'), importedProgram);

  const tabStatus = useMemo((): Record<TabValue, TabAttention> => {
    const intakeDone = Boolean(questionnaire);
    if (importedProgram) {
      const { ready, total } = importedBuilderProgress;
      let workoutsStatus: TabAttention = 'neutral';
      if (total > 0) {
        workoutsStatus =
          ready >= total ? 'complete' : 'attention';
      }
      return {
        overview: 'neutral',
        questionnaire: intakeDone ? 'complete' : 'neutral',
        inbody: hasVerifiedScan ? 'complete' : 'neutral',
        training: recommendation ? 'complete' : 'neutral',
        workouts: workoutsStatus,
      };
    }
    return {
      overview: 'neutral',
      questionnaire: intakeDone ? 'complete' : 'attention',
      inbody: hasVerifiedScan ? 'complete' : 'attention',
      training: recommendation ? 'complete' : 'attention',
      workouts: hasWorkouts ? 'complete' : 'attention',
    };
  }, [
    questionnaire,
    hasVerifiedScan,
    recommendation,
    hasWorkouts,
    importedBuilderProgress,
    importedProgram,
  ]);

  useEffect(() => {
    if (!importedProgram) return;
    const raw = searchParams.get('tab');
    if (!raw || IMPORTED_VISIBLE_TABS.has(raw as TabValue)) return;
    const q = new URLSearchParams(searchParams.toString());
    q.set('tab', 'workouts');
    q.set('imported', '1');
    router.replace(`/clients/${clientId}?${q.toString()}`, { scroll: false });
  }, [importedProgram, searchParams, clientId, router]);

  const setTab = useCallback(
    (value: string) => {
      const q = new URLSearchParams(searchParams.toString());
      q.set('tab', value);
      if (importedProgram) {
        q.set('imported', '1');
      }
      router.replace(`/clients/${clientId}?${q.toString()}`, {
        scroll: false,
      });
    },
    [clientId, router, searchParams, importedProgram]
  );

  const visibleTabItems = importedProgram ? IMPORTED_TAB_ITEMS : TAB_ITEMS;

  const refreshInBody = useCallback(() => {
    void onRefresh();
  }, [onRefresh]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full space-y-6">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg bg-muted p-1 sm:inline-flex">
        {visibleTabItems.map(({ value, label }) => {
          const status = tabStatus[value];
          return (
            <TabsTrigger
              key={value}
              value={value}
              aria-label={tabAccessibleLabel(label, status)}
              className="flex-1 sm:flex-initial"
            >
              <TabLabel status={status}>{label}</TabLabel>
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="overview" className="mt-0 space-y-0">
        <ClientInformationSection
          client={client}
          recommendation={recommendation}
          onClientUpdate={onClientUpdate}
          onRecommendationUpdate={onRecommendationUpdate}
        />
      </TabsContent>

      {!importedProgram ? (
        <>
          <TabsContent value="questionnaire" className="mt-0">
            <QuestionnaireSection
              clientId={clientId}
              questionnaire={questionnaire}
            />
          </TabsContent>

          <TabsContent value="inbody" className="mt-0">
            <InBodyScansSection clientId={clientId} onUpdate={refreshInBody} />
          </TabsContent>

          <TabsContent value="training" className="mt-0">
            <TrainingPlansSection
              clientId={clientId}
              questionnaire={questionnaire}
              recommendation={recommendation}
              onRecommendationUpdate={onRecommendationUpdate}
              onRefresh={onRefresh}
            />
          </TabsContent>
        </>
      ) : null}

      <TabsContent value="workouts" className="mt-0 space-y-4">
        {!importedProgram ? (
          <p className="text-sm text-muted-foreground">
            Library plans may already include sessions. Otherwise use{' '}
            <span className="font-medium text-foreground">Generate workouts</span>{' '}
            to draft sessions, save from the preview, then open{' '}
            <span className="font-medium text-foreground">Review mesocycle</span>{' '}
            (Coach &amp; plan) to swap exercises. Schedule and track sessions
            here.
          </p>
        ) : null}
        <WorkoutsSection
          clientId={clientId}
          recommendation={recommendation}
          importedProgram={importedProgram}
          onWorkoutsPresenceChange={onWorkoutsPresenceChange}
          onImportedBuilderProgressChange={onImportedBuilderProgressChange}
        />
      </TabsContent>
    </Tabs>
  );
}
