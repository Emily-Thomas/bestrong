'use client';

import { Loader2, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { type CreateQuestionnaireInput, questionnairesApi } from '@/lib/api';
import { QUESTIONNAIRE_SECTIONS } from './config';
import { QuestionComponent } from './QuestionComponents';
import {
  buildQuestionnaireApiInput,
  DEFAULT_QUESTIONNAIRE,
  isLegacyV1Notes,
  validateQuestionnaire,
} from './submit';
import type { QuestionnaireData } from './types';

export interface QuestionnaireFormProps {
  clientId: number;
  /** Called after a successful save (embedded mode skips router navigation). */
  onSuccess?: () => void;
  /** If true, do not navigate away after save — call onSuccess only. */
  embedded?: boolean;
  /** Secondary action when not embedded (e.g. router.back). Hidden when embedded. */
  onCancel?: () => void;
}

export function QuestionnaireForm({
  clientId,
  onSuccess,
  embedded = false,
  onCancel,
}: QuestionnaireFormProps) {
  const [formData, setFormData] = useState<QuestionnaireData>(
    DEFAULT_QUESTIONNAIRE
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [questionnaireId, setQuestionnaireId] = useState<number | null>(null);
  const [legacyBanner, setLegacyBanner] = useState(false);

  const mergedDefaults = useMemo(
    () => ({
      ...DEFAULT_QUESTIONNAIRE,
      ...formData,
      schema_version: 2 as const,
    }),
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
      setSaving(false);
      onSuccess?.();
      return;
    }
    setError(response.error || 'Failed to save questionnaire');
    setSaving(false);
  };

  if (loading) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
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
            Your old slider-based answers could not be migrated automatically.
            The form has been reset to the new intake — please complete it
            again.
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
              <CardTitle className="text-base">{section.title}</CardTitle>
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
        {!embedded && onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save questionnaire
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
