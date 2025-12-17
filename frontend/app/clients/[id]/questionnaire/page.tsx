'use client';

import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
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
import { type CreateQuestionnaireInput, questionnairesApi } from '@/lib/api';

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

  const loadQuestionnaire = async () => {
    const response = await questionnairesApi.getByClientId(clientId);
    if (response.success && response.data) {
      const q = response.data;
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
    if (response.success) {
      router.push(`/clients/${clientId}`);
    } else {
      setError(response.error || 'Failed to save questionnaire');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8 max-w-4xl">
          <div className="mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Client Questionnaire
            </h1>
            <p className="text-muted-foreground">
              Comprehensive assessment to create the perfect training plan
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Section 1 - Starting Point */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Section 1 – Starting Point</CardTitle>
                <CardDescription>
                  Understanding where you're starting from
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Slider
                  label="How healthy and energetic do you feel on a typical day?"
                  min={1}
                  max={10}
                  value={formData.section1_energy_level || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section1_energy_level: parseInt(e.target.value, 10),
                    })
                  }
                />

                <Slider
                  label="How consistent have you been with exercise over the past 3 months?"
                  min={1}
                  max={10}
                  value={formData.section1_exercise_consistency || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section1_exercise_consistency: parseInt(
                        e.target.value,
                        10
                      ),
                    })
                  }
                />

                <Slider
                  label="How confident do you feel performing strength-based movements?"
                  min={1}
                  max={10}
                  value={formData.section1_strength_confidence || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section1_strength_confidence: parseInt(
                        e.target.value,
                        10
                      ),
                    })
                  }
                />

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
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Section 2 – Motivation & Mindset</CardTitle>
                <CardDescription>
                  What drives you and keeps you going
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Slider
                  label="How motivated are you to make a real change right now?"
                  min={1}
                  max={10}
                  value={formData.section2_motivation || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section2_motivation: parseInt(e.target.value, 10),
                    })
                  }
                />

                <Slider
                  label="How disciplined do you tend to be once a plan is in place?"
                  min={1}
                  max={10}
                  value={formData.section2_discipline || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section2_discipline: parseInt(e.target.value, 10),
                    })
                  }
                />

                <Slider
                  label="How supported do you feel in your current environment (friends/family/routine)?"
                  min={1}
                  max={10}
                  value={formData.section2_support_level || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section2_support_level: parseInt(e.target.value, 10),
                    })
                  }
                />

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
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Section 3 – Body & Movement</CardTitle>
                <CardDescription>
                  Understanding your physical capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Slider
                  label="How limited do you feel by pain, injury, or past issues?"
                  min={1}
                  max={10}
                  value={formData.section3_pain_limitations || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section3_pain_limitations: parseInt(e.target.value, 10),
                    })
                  }
                />

                <Slider
                  label="How confident are you in your mobility and range of motion?"
                  min={1}
                  max={10}
                  value={formData.section3_mobility_confidence || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section3_mobility_confidence: parseInt(
                        e.target.value,
                        10
                      ),
                    })
                  }
                />

                <Slider
                  label="How strong do you feel compared to your ideal self?"
                  min={1}
                  max={10}
                  value={formData.section3_strength_comparison || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section3_strength_comparison: parseInt(
                        e.target.value,
                        10
                      ),
                    })
                  }
                />
              </CardContent>
            </Card>

            {/* Section 4 - Nutrition & Recovery */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Section 4 – Nutrition & Recovery</CardTitle>
                <CardDescription>
                  Assessing your recovery and fueling habits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Slider
                  label="How aligned do you feel your nutrition habits are with your goals?"
                  min={1}
                  max={10}
                  value={formData.section4_nutrition_alignment || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section4_nutrition_alignment: parseInt(
                        e.target.value,
                        10
                      ),
                    })
                  }
                />

                <Slider
                  label="How consistent is your meal pattern and portion awareness?"
                  min={1}
                  max={10}
                  value={formData.section4_meal_consistency || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section4_meal_consistency: parseInt(e.target.value, 10),
                    })
                  }
                />

                <Slider
                  label="How well do you sleep and recover?"
                  min={1}
                  max={10}
                  value={formData.section4_sleep_quality || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section4_sleep_quality: parseInt(e.target.value, 10),
                    })
                  }
                />

                <Slider
                  label="How much daily stress do you carry right now?"
                  min={1}
                  max={10}
                  value={formData.section4_stress_level || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section4_stress_level: parseInt(e.target.value, 10),
                    })
                  }
                />
              </CardContent>
            </Card>

            {/* Section 5 - Identity & Self-Perception */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Section 5 – Identity & Self-Perception</CardTitle>
                <CardDescription>
                  Understanding your relationship with your body and goals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Slider
                  label="How connected do you feel to your body right now?"
                  min={1}
                  max={10}
                  value={formData.section5_body_connection || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section5_body_connection: parseInt(e.target.value, 10),
                    })
                  }
                />

                <Slider
                  label="How satisfied are you with your current physical appearance?"
                  min={1}
                  max={10}
                  value={formData.section5_appearance_satisfaction || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section5_appearance_satisfaction: parseInt(
                        e.target.value,
                        10
                      ),
                    })
                  }
                />

                <Slider
                  label="How much of your motivation is driven by appearance vs. performance/longevity?"
                  min={1}
                  max={10}
                  value={formData.section5_motivation_driver || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section5_motivation_driver: parseInt(e.target.value, 10),
                    })
                  }
                />

                <Slider
                  label="How confident are you that you'll sustain results once you achieve them?"
                  min={1}
                  max={10}
                  value={formData.section5_sustainability_confidence || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section5_sustainability_confidence: parseInt(
                        e.target.value,
                        10
                      ),
                    })
                  }
                />

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
    </ProtectedRoute>
  );
}
