'use client';

import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import {
  type CreateQuestionnaireInput,
  questionnairesApi,
} from '@/lib/api';
import { QuestionComponent } from './QuestionComponents';
import { QUESTIONNAIRE_SECTIONS } from './config';
import type { QuestionnaireData } from './types';

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);

  const [formData, setFormData] = useState<QuestionnaireData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [questionnaireId, setQuestionnaireId] = useState<number | null>(null);


  const loadQuestionnaire = async () => {
    const response = await questionnairesApi.getByClientId(clientId);
    if (response.success && response.data) {
      const q = response.data;
      setQuestionnaireId(q.id);
      // Try to load from notes field (stored as JSON) or initialize empty
      try {
        if (q.notes) {
          const parsed = JSON.parse(q.notes);
          setFormData(parsed);
        }
      } catch {
        // If notes is not JSON, start fresh
      }

    }
    setLoading(false);
  };

  useEffect(() => {
    loadQuestionnaire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    // Store the structured data in the notes field as JSON
    const questionnaireInput: CreateQuestionnaireInput = {
      client_id: clientId,
      notes: JSON.stringify(formData),
    };

    const response = await questionnairesApi.create(questionnaireInput);
    if (response.success && response.data) {
      const savedQuestionnaire = response.data;
      setQuestionnaireId(savedQuestionnaire.id);
      // Redirect back to client page after saving
      router.push(`/clients/${clientId}`);
    } else {
      setError(response.error || 'Failed to save questionnaire');
      setSaving(false);
    }
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
        description="Comprehensive assessment to create the perfect training plan"
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
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {QUESTIONNAIRE_SECTIONS.map((section, sectionIndex) => (
                <Card key={sectionIndex} className="border-border/60">
                  <CardHeader>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {section.questions.map((question, questionIndex) => (
                      <QuestionComponent
                        key={questionIndex}
                        question={question}
                        formData={formData}
                        setFormData={setFormData}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
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
