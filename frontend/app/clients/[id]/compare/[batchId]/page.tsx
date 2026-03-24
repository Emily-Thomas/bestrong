'use client';

import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type Recommendation,
  recommendationsApi,
  type Trainer,
} from '@/lib/api';

type PlanRow = { recommendation: Recommendation; trainer: Trainer | null };

export default function ClientCompareCoachesPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);
  const batchId = typeof params.batchId === 'string' ? params.batchId : '';

  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectingId, setSelectingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!batchId) {
      setLoading(false);
      return;
    }
    const res = await recommendationsApi.getComparisonBatch(batchId);
    if (res.success && res.data) {
      setPlans(res.data.plans);
    } else {
      setError(res.error || 'Could not load comparison.');
    }
    setLoading(false);
  }, [batchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = async (recommendationId: number) => {
    setSelectingId(recommendationId);
    setError('');
    const res = await recommendationsApi.selectComparisonPlan(
      batchId,
      recommendationId
    );
    setSelectingId(null);
    if (res.success && res.data) {
      router.push(`/clients/${clientId}/recommendations/${recommendationId}`);
      return;
    }
    setError(res.error || 'Could not select this plan.');
  };

  return (
    <ProtectedRoute>
      <AppShell
        backAction={
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link href={`/clients/${clientId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Client
            </Link>
          </Button>
        }
        title="Compare coach plans"
        description="Each column is training direction from the questionnaire and InBody, steered by that coach’s persona. Choose one to keep, then build workouts manually on the training plan."
      >
        {loading ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Loading plans…
          </div>
        ) : error && plans.length === 0 ? (
          <p className="text-destructive">{error}</p>
        ) : (
          <div className="space-y-6">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {plans.map(({ recommendation: r, trainer: t }) => (
                <Card
                  key={r.id}
                  className="flex flex-col border-border/80 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-snug">
                        {t ? `${t.first_name} ${t.last_name}` : 'Coach'}
                      </CardTitle>
                      <Badge variant="secondary">Candidate</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {t?.title || 'Training plan'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Client archetype
                      </p>
                      <p className="text-sm font-medium">{r.client_type}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Training style
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                        {r.training_style}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {r.sessions_per_week} sessions/week ·{' '}
                      {r.session_length_minutes} min
                    </div>
                    <div className="flex flex-wrap gap-2 mt-auto pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/clients/${clientId}/recommendations/${r.id}`}
                        >
                          Preview full plan
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void choose(r.id)}
                        disabled={selectingId !== null}
                      >
                        {selectingId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1.5" />
                            Use this coach
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
