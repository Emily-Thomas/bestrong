'use client';

import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type CreateQuestionnaireInput,
  questionnairesApi,
} from '@/lib/api';
import { QuestionComponent } from './QuestionComponents';
import { QUESTIONNAIRE_SECTIONS } from './config';
import type { QuestionnaireData } from './types';
import {
  DEFAULT_QUESTIONNAIRE,
  buildQuestionnaireApiInput,
  isLegacyV1Notes,
  validateQuestionnaire,
} from './submit';

function parqAnyYes(d: QuestionnaireData): boolean {
  return !!(
    d.parq_chest_pain ||
    d.parq_resting_bp ||
    d.parq_dizziness ||
    d.parq_bone_joint ||
    d.parq_heart_meds ||
    d.parq_other_reason ||
    d.parq_extra
  );
}

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);

  const [formData, setFormData] = useState<QuestionnaireData>(DEFAULT_QUESTIONNAIRE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [questionnaireId, setQuestionnaireId] = useState<number | null>(null);
  const [legacyBanner, setLegacyBanner] = useState(false);

  const mergedDefaults = useMemo(
    () => ({ ...DEFAULT_QUESTIONNAIRE, ...formData, schema_version: 2 as const }),
    [formData]
  );

  useEffect(() => {
    const loadQuestionnaire = async () => {
      const response = await questionnairesApi.getByClientId(clientId);
      if (response.success && response.data) {
        const q = response.data;
        setQuestionnaireId(q.id);
        if (q.notes) {
          try {
            const parsed = JSON.parse(q.notes) as unknown;
            if (isLegacyV1Notes(parsed)) {
              setLegacyBanner(true);
              setFormData(DEFAULT_QUESTIONNAIRE);
            } else {
              setFormData({
                ...DEFAULT_QUESTIONNAIRE,
                ...(parsed as QuestionnaireData),
                schema_version: 2,
              });
            }
          } catch {
            setFormData(DEFAULT_QUESTIONNAIRE);
          }
        } else {
          setFormData(DEFAULT_QUESTIONNAIRE);
        }
      }
      setLoading(false);
    };
    void loadQuestionnaire();
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const err = validateQuestionnaire(mergedDefaults);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);

    const payload: CreateQuestionnaireInput = buildQuestionnaireApiInput(
      clientId,
      mergedDefaults
    );

    const response = questionnaireId
      ? await questionnairesApi.update(questionnaireId, payload)
      : await questionnairesApi.create(payload);

    if (response.success && response.data) {
      setQuestionnaireId(response.data.id);
      router.push(`/clients/${clientId}`);
      return;
    }
    setError(response.error || 'Failed to save questionnaire');
    setSaving(false);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell
          title="Client Questionnaire"
          description="Loading questionnaire..."
        >
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell
        title="Client Questionnaire"
        description="Help us program for your goals, schedule, and history"
        action={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      >
        <div className="flex justify-center">
          <div className="w-full max-w-4xl space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {legacyBanner ? (
                <Alert>
                  <AlertTitle>Previous format detected</AlertTitle>
                  <AlertDescription>
                    Your old slider-based answers could not be migrated automatically. The form
                    has been reset to the new intake — please complete it again.
                  </AlertDescription>
                </Alert>
              ) : null}

              {parqAnyYes(mergedDefaults) ? (
                <Alert variant="default" className="border-amber-500/40 bg-amber-500/5">
                  <AlertTitle>Medical clearance</AlertTitle>
                  <AlertDescription>
                    You answered yes to at least one screening question. You may need clearance
                    from a clinician before increasing exercise intensity — your coach will use
                    this as context, not as a diagnosis.
                  </AlertDescription>
                </Alert>
              ) : null}

              {QUESTIONNAIRE_SECTIONS.map((section) => {
                if (section.showWhen && !section.showWhen(mergedDefaults)) {
                  return null;
                }
                return (
                  <Card key={section.title} className="border-border/60">
                    <CardHeader>
                      <CardTitle>{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {section.questions.map((question) => (
                        <QuestionComponent
                          key={String(question.fieldName)}
                          question={question}
                          formData={mergedDefaults}
                          setFormData={setFormData}
                        />
                      ))}
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => router.back()}>
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
                      Save Questionnaire
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
