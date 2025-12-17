'use client';

import { ArrowLeft, Edit, Loader2, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  type Recommendation,
  recommendationsApi,
  type UpdateRecommendationInput,
} from '@/lib/api';

export default function RecommendationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);
  const recId = Number(params.recId);

  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null
  );
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateRecommendationInput>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadRecommendation = useCallback(async () => {
    const response = await recommendationsApi.getById(recId);
    if (response.success && response.data) {
      setRecommendation(response.data);
      setFormData({
        sessions_per_week: response.data.sessions_per_week,
        session_length_minutes: response.data.session_length_minutes,
        training_style: response.data.training_style,
        status: response.data.status,
      });
    }
    setLoading(false);
  }, [recId]);

  useEffect(() => {
    loadRecommendation();
  }, [loadRecommendation]);

  const handleSave = async () => {
    setError('');
    setSaving(true);

    const response = await recommendationsApi.update(recId, formData);
    if (response.success && response.data) {
      setRecommendation(response.data);
      setEditing(false);
    } else {
      setError(response.error || 'Failed to update recommendation');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Recommendation" description="Loading details">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!recommendation) {
    return (
      <ProtectedRoute>
        <AppShell title="Recommendation" description="Not found">
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              Recommendation not found
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell
        title={recommendation.client_type}
        description="AI-generated training plan recommendation"
        action={
          !editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )
        }
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/clients/${clientId}`)}
          className="mb-4 w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Client
        </Button>

        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{recommendation.status}</Badge>
              {recommendation.is_edited && (
                <Badge variant="outline" className="gap-1">
                  <Edit className="h-3 w-3" />
                  Edited
                </Badge>
              )}
            </div>
            <CardTitle>Training Plan Details</CardTitle>
            <CardDescription>
              Review and customize the recommended training plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {editing ? (
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sessions_per_week">Sessions Per Week</Label>
                    <Input
                      id="sessions_per_week"
                      type="number"
                      min="1"
                      max="7"
                      value={formData.sessions_per_week}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sessions_per_week: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session_length_minutes">
                      Session Length (minutes)
                    </Label>
                    <Input
                      id="session_length_minutes"
                      type="number"
                      min="15"
                      max="120"
                      step="15"
                      value={formData.session_length_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          session_length_minutes: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="training_style">Training Style</Label>
                  <Input
                    id="training_style"
                    value={formData.training_style}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        training_style: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as Recommendation['status'],
                      })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </Select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      loadRecommendation();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Card className="bg-muted/50">
                    <CardContent className="p-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          Sessions Per Week
                        </p>
                        <p className="text-3xl font-bold text-primary">
                          {recommendation.sessions_per_week}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          Session Length
                        </p>
                        <p className="text-3xl font-bold text-primary">
                          {recommendation.session_length_minutes} min
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label>Training Style</Label>
                  <p className="text-lg">{recommendation.training_style}</p>
                </div>

                {recommendation.ai_reasoning && (
                  <div className="space-y-2">
                    <Label>AI Reasoning</Label>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">
                          {recommendation.ai_reasoning}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {recommendation.plan_structure && (
                  <div className="space-y-2">
                    <Label>6-Week Plan Structure</Label>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono overflow-x-auto">
                          {JSON.stringify(
                            recommendation.plan_structure,
                            null,
                            2
                          )}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div>
                    <Badge
                      variant={
                        recommendation.status === 'active'
                          ? 'default'
                          : recommendation.status === 'approved'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {recommendation.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </AppShell>
    </ProtectedRoute>
  );
}
