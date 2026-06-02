import type { ActualWorkoutPerformance } from '@/lib/api';
import type { PreWorkoutSurveyResponse } from '../components/PreWorkoutSurvey';

export interface SessionFormSnapshot {
  performance: ActualWorkoutPerformance;
  sessionNotes: string;
  trainerObservations: string;
  workoutRating?: 'happy' | 'meh' | 'sad';
  surveyResponse: PreWorkoutSurveyResponse | null;
  surveySkipped: boolean;
}

export function serializeSessionSnapshot(snapshot: SessionFormSnapshot): string {
  return JSON.stringify(snapshot);
}
