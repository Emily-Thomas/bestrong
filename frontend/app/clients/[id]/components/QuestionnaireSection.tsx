'use client';

import { FileText } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Questionnaire } from '@/lib/api';

interface QuestionnaireSectionProps {
  clientId: number;
  questionnaire: Questionnaire | null;
}

function v2Summary(notes: string): { line1: string; line2?: string } | null {
  try {
    const p = JSON.parse(notes) as {
      schema_version?: number;
      primary_goal_label?: string;
      goal_categories?: string[];
      work_pattern?: string;
      available_days_per_week?: number;
    };
    if (p.schema_version !== 2 && !p.work_pattern) return null;
    const goals =
      (p.goal_categories ?? []).join(', ') ||
      p.primary_goal_label ||
      'Goals on file';
    const days =
      p.available_days_per_week != null
        ? `${p.available_days_per_week} d/wk`
        : '';
    const work = p.work_pattern ? p.work_pattern.replace(/_/g, ' ') : '';
    return {
      line1: goals,
      line2: [work, days].filter(Boolean).join(' · ') || undefined,
    };
  } catch {
    return null;
  }
}

export function QuestionnaireSection({
  clientId,
  questionnaire,
}: QuestionnaireSectionProps) {
  return (
    <Card id="questionnaire-section">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Questionnaire</CardTitle>
          <CardDescription>
            Goals and background for programming
          </CardDescription>
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
            {questionnaire.notes ? (
              (() => {
                const s = v2Summary(questionnaire.notes);
                if (s) {
                  return (
                    <>
                      <div>
                        <span className="font-medium">Goals:</span> {s.line1}
                      </div>
                      {s.line2 ? (
                        <div className="text-muted-foreground">{s.line2}</div>
                      ) : null}
                    </>
                  );
                }
                return (
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
                );
              })()
            ) : (
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
  );
}
