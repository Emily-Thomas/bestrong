'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { QuestionnaireForm } from './QuestionnaireForm';

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);

  return (
    <ProtectedRoute>
      <AppShell
        title="Questionnaire"
        description="Goals, schedule, and background so Milo can program well"
        action={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      >
        <div className="mx-auto w-full max-w-4xl">
          <QuestionnaireForm
            clientId={clientId}
            onSuccess={() => router.push(`/clients/${clientId}`)}
            onCancel={() => router.back()}
          />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
