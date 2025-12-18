'use client';

import { FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Questionnaire } from '@/lib/api';

interface QuestionnaireSectionProps {
  clientId: number;
  questionnaire: Questionnaire | null;
}

export function QuestionnaireSection({
  clientId,
  questionnaire,
}: QuestionnaireSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Questionnaire</CardTitle>
          <CardDescription>Goals and preferences</CardDescription>
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
            {!questionnaire.notes && (
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

