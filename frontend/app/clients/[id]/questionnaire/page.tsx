'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Loader2, Save, Sparkles } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  type CreateQuestionnaireInput,
  questionnairesApi,
  recommendationsApi,
} from '@/lib/api';

interface QuestionnaireData {
  // Section 1 - Starting Point
  section1_energy_level?: number;
  section1_exercise_consistency?: number;
  section1_strength_confidence?: number;
  section1_limiting_factors?: string;

  // Section 2 - Motivation & Mindset
  section2_motivation?: number;
  section2_discipline?: number;
  section2_support_level?: number;
  section2_what_keeps_going?: string;

  // Section 3 - Body & Movement
  section3_pain_limitations?: number;
  section3_mobility_confidence?: number;
  section3_strength_comparison?: number;

  // Section 4 - Nutrition & Recovery
  section4_nutrition_alignment?: number;
  section4_meal_consistency?: number;
  section4_sleep_quality?: number;
  section4_stress_level?: number;

  // Section 5 - Identity & Self-Perception
  section5_body_connection?: number;
  section5_appearance_satisfaction?: number;
  section5_motivation_driver?: number;
  section5_sustainability_confidence?: number;
  section5_success_vision?: string;
}

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);

  const [formData, setFormData] = useState<QuestionnaireData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [questionnaireId, setQuestionnaireId] = useState<number | null>(null);
  const [hasExistingRecommendation, setHasExistingRecommendation] =
    useState(false);
  const [generating, setGenerating] = useState(false);

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

      // Check if recommendation exists for this questionnaire
      const recResponse =
        await recommendationsApi.getByQuestionnaireId(q.id);
      setHasExistingRecommendation(recResponse.success && !!recResponse.data);
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

      // Check if recommendation exists for this questionnaire
      const recResponse = await recommendationsApi.getByQuestionnaireId(
        savedQuestionnaire.id
      );
      const hasRec = recResponse.success && !!recResponse.data;
      setHasExistingRecommendation(hasRec);

      // Show dialog to generate/regenerate
      setShowGenerateDialog(true);
    } else {
      setError(response.error || 'Failed to save questionnaire');
    }
    setSaving(false);
  };

  const handleGeneratePlan = async () => {
    if (!questionnaireId) return;

    setGenerating(true);
    setError('');

    const response =
      await recommendationsApi.generateFromQuestionnaire(questionnaireId);
    if (response.success) {
      setShowGenerateDialog(false);
      router.push(`/clients/${clientId}`);
    } else {
      setError(response.error || 'Failed to generate training plan');
      setGenerating(false);
    }
  };

  const handleSkipGeneration = () => {
    setShowGenerateDialog(false);
    router.push(`/clients/${clientId}`);
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
          <div className="w-full max-w-4xl">
            <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

              {/* Section 1 - Starting Point */}
              <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Section 1 – Starting Point</CardTitle>
                <CardDescription>
                  Understanding where you're starting from
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>How healthy and energetic do you feel on a typical day?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section1_energy_level || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section1_energy_level: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>How consistent have you been with exercise over the past 3 months?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section1_exercise_consistency || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section1_exercise_consistency: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>How confident do you feel performing strength-based movements?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section1_strength_confidence || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section1_strength_confidence: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section1_limiting_factors">
                    Briefly describe what's been holding you back or limiting
                    progress.
                  </Label>
                  <Textarea
                    id="section1_limiting_factors"
                    rows={3}
                    placeholder="Share what's been challenging..."
                    value={formData.section1_limiting_factors || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        section1_limiting_factors: e.target.value,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

              {/* Section 2 - Motivation & Mindset */}
              <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Section 2 – Motivation & Mindset</CardTitle>
                <CardDescription>
                  What drives you and keeps you going
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>How motivated are you to make a real change right now?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section2_motivation || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section2_motivation: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>How disciplined do you tend to be once a plan is in place?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section2_discipline || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section2_discipline: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>How supported do you feel in your current environment (friends/family/routine)?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section2_support_level || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section2_support_level: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section2_what_keeps_going">
                    What typically keeps you going when training gets
                    challenging?
                  </Label>
                  <Textarea
                    id="section2_what_keeps_going"
                    rows={3}
                    placeholder="Share what motivates you..."
                    value={formData.section2_what_keeps_going || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        section2_what_keeps_going: e.target.value,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

              {/* Section 3 - Body & Movement */}
              <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Section 3 – Body & Movement</CardTitle>
                <CardDescription>
                  Understanding your physical capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>How limited do you feel by pain, injury, or past issues?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section3_pain_limitations || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section3_pain_limitations: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>How confident are you in your mobility and range of motion?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section3_mobility_confidence || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section3_mobility_confidence: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>How strong do you feel compared to your ideal self?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section3_strength_comparison || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section3_strength_comparison: value[0],
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

              {/* Section 4 - Nutrition & Recovery */}
              <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Section 4 – Nutrition & Recovery</CardTitle>
                <CardDescription>
                  Assessing your recovery and fueling habits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>How aligned do you feel your nutrition habits are with your goals?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section4_nutrition_alignment || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section4_nutrition_alignment: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>How consistent is your meal pattern and portion awareness?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section4_meal_consistency || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section4_meal_consistency: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>How well do you sleep and recover?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section4_sleep_quality || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section4_sleep_quality: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>How much daily stress do you carry right now?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section4_stress_level || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section4_stress_level: value[0],
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

              {/* Section 5 - Identity & Self-Perception */}
              <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Section 5 – Identity & Self-Perception</CardTitle>
                <CardDescription>
                  Understanding your relationship with your body and goals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>How connected do you feel to your body right now?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section5_body_connection || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section5_body_connection: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>How satisfied are you with your current physical appearance?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section5_appearance_satisfaction || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section5_appearance_satisfaction: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>How much of your motivation is driven by appearance vs. performance/longevity?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section5_motivation_driver || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section5_motivation_driver: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>How confident are you that you'll sustain results once you achieve them?</Label>
                  <Slider
                    min={1}
                    max={10}
                    value={[formData.section5_sustainability_confidence || 5]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        section5_sustainability_confidence: value[0],
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section5_success_vision">
                    Describe briefly what "success" would look and feel like six
                    months from now.
                  </Label>
                  <Textarea
                    id="section5_success_vision"
                    rows={4}
                    placeholder="Paint a picture of your success..."
                    value={formData.section5_success_vision || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        section5_success_vision: e.target.value,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

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

        <AlertDialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {hasExistingRecommendation
                  ? 'Regenerate Training Plan?'
                  : 'Generate Training Plan?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {hasExistingRecommendation
                  ? 'You already have a training plan for this questionnaire. Would you like to regenerate it based on the updated questionnaire responses?'
                  : 'Would you like to generate an AI-powered training plan based on the questionnaire responses?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={handleSkipGeneration}
                disabled={generating}
              >
                Skip
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleGeneratePlan}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {hasExistingRecommendation ? 'Regenerate' : 'Generate'}
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppShell>
    </ProtectedRoute>
  );
}
