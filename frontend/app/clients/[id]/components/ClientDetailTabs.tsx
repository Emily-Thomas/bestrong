'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Client, Questionnaire, Recommendation } from '@/lib/api';
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

function normalizeTab(raw: string | null): TabValue {
  if (raw && (TAB_VALUES as readonly string[]).includes(raw)) {
    return raw as TabValue;
  }
  return 'overview';
}

interface ClientDetailTabsProps {
  clientId: number;
  client: Client;
  questionnaire: Questionnaire | null;
  recommendation: Recommendation | null;
  onRefresh: () => void | Promise<void>;
  onClientUpdate: (client: Client) => void;
  onRecommendationUpdate: (recommendation: Recommendation | null) => void;
}

export function ClientDetailTabs({
  clientId,
  client,
  questionnaire,
  recommendation,
  onRefresh,
  onClientUpdate,
  onRecommendationUpdate,
}: ClientDetailTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = normalizeTab(searchParams.get('tab'));

  const setTab = useCallback(
    (value: string) => {
      const q = new URLSearchParams(searchParams.toString());
      q.set('tab', value);
      router.replace(`/clients/${clientId}?${q.toString()}`, {
        scroll: false,
      });
    },
    [clientId, router, searchParams]
  );

  const refreshInBody = useCallback(() => {
    void onRefresh();
  }, [onRefresh]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full space-y-6">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg bg-muted p-1 sm:inline-flex">
        <TabsTrigger value="overview" className="flex-1 sm:flex-initial">
          Overview
        </TabsTrigger>
        <TabsTrigger value="questionnaire" className="flex-1 sm:flex-initial">
          Questionnaire
        </TabsTrigger>
        <TabsTrigger value="inbody" className="flex-1 sm:flex-initial">
          InBody
        </TabsTrigger>
        <TabsTrigger value="training" className="flex-1 sm:flex-initial">
          Coach &amp; plan
        </TabsTrigger>
        <TabsTrigger value="workouts" className="flex-1 sm:flex-initial">
          Workouts
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0 space-y-0">
        <ClientInformationSection
          client={client}
          recommendation={recommendation}
          onClientUpdate={onClientUpdate}
          onRecommendationUpdate={onRecommendationUpdate}
        />
      </TabsContent>

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

      <TabsContent value="workouts" className="mt-0 space-y-4">
        <p className="text-sm text-muted-foreground">
          Library plans may already include sessions. Otherwise use{' '}
          <span className="font-medium text-foreground">Generate workouts</span>{' '}
          to draft sessions, save from the preview, then open{' '}
          <span className="font-medium text-foreground">Review mesocycle</span>{' '}
          (Coach &amp; plan) to swap exercises. Schedule and track sessions
          here.
        </p>
        <WorkoutsSection clientId={clientId} recommendation={recommendation} />
      </TabsContent>
    </Tabs>
  );
}
