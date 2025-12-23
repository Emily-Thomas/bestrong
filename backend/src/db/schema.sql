-- Admin Users (gym owners/trainers)
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  date_of_birth DATE,
  status VARCHAR(50) DEFAULT 'prospect', -- prospect, active, inactive, archived
  created_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client Questionnaires
CREATE TABLE IF NOT EXISTS questionnaires (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  filled_by INTEGER REFERENCES admin_users(id),
  
  -- Goals and Preferences
  primary_goal TEXT,
  secondary_goals TEXT[], -- Array of goals
  experience_level VARCHAR(50), -- beginner, intermediate, advanced
  preferred_training_style TEXT[], -- Array of styles
  available_days_per_week INTEGER,
  preferred_session_length INTEGER, -- in minutes
  time_preferences TEXT[], -- morning, afternoon, evening
  injury_history TEXT,
  medical_conditions TEXT,
  fitness_equipment_access TEXT[], -- gym, home, both
  
  -- Lifestyle factors
  activity_level VARCHAR(50), -- sedentary, lightly_active, moderately_active, very_active
  stress_level VARCHAR(50), -- low, moderate, high
  sleep_quality VARCHAR(50), -- poor, fair, good, excellent
  nutrition_habits VARCHAR(50), -- poor, fair, good, excellent
  
  -- Additional notes
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Recommendations (6-week training plans)
CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  questionnaire_id INTEGER REFERENCES questionnaires(id),
  created_by INTEGER REFERENCES admin_users(id),
  
  -- Recommendation details
  client_type VARCHAR(100), -- The stereotype/type determined by AI
  sessions_per_week INTEGER NOT NULL,
  session_length_minutes INTEGER NOT NULL,
  training_style TEXT NOT NULL,
  
  -- 6-week plan structure (stored as JSON)
  plan_structure JSONB,
  
  -- AI reasoning/explanation
  ai_reasoning TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, approved, active, completed
  is_edited BOOLEAN DEFAULT FALSE,
  
  -- Week tracking
  current_week INTEGER DEFAULT 1,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Edited Recommendations (when admin modifies AI recommendation)
CREATE TABLE IF NOT EXISTS recommendation_edits (
  id SERIAL PRIMARY KEY,
  recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  edited_by INTEGER REFERENCES admin_users(id),
  
  -- Modified fields
  sessions_per_week INTEGER,
  session_length_minutes INTEGER,
  training_style TEXT,
  plan_structure JSONB,
  edit_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workouts (individual workout sessions within a recommendation)
CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY,
  recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  
  -- Workout metadata
  week_number INTEGER NOT NULL,
  session_number INTEGER NOT NULL, -- Session number within the week (1, 2, 3, etc.)
  workout_name VARCHAR(255), -- Optional name for the workout
  
  -- Workout structure (stored as JSON)
  -- Contains: exercises array with name, sets, reps, weight, rest, notes, etc.
  workout_data JSONB NOT NULL,
  
  -- AI reasoning for this specific workout
  workout_reasoning TEXT,
  
  -- Execution tracking
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, skipped, cancelled
  scheduled_date DATE,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique workout per session
  UNIQUE(recommendation_id, week_number, session_number)
);

-- Add new columns to existing tables (idempotent)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'prospect';
UPDATE clients SET status = 'prospect' WHERE status IS NULL;

ALTER TABLE recommendations 
  ADD COLUMN IF NOT EXISTS current_week INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
UPDATE recommendations SET current_week = 1 WHERE current_week IS NULL;

ALTER TABLE workouts 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
UPDATE workouts SET status = 'scheduled' WHERE status IS NULL;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_questionnaires_client_id ON questionnaires(client_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_client_id ON recommendations(client_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_current_week ON recommendations(current_week);
CREATE INDEX IF NOT EXISTS idx_recommendation_edits_recommendation_id ON recommendation_edits(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_workouts_recommendation_id ON workouts(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_workouts_week_session ON workouts(recommendation_id, week_number, session_number);
CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);
CREATE INDEX IF NOT EXISTS idx_workouts_scheduled_date ON workouts(scheduled_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questionnaires_updated_at BEFORE UPDATE ON questionnaires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recommendation Generation Jobs (for async processing)
CREATE TABLE IF NOT EXISTS recommendation_jobs (
  id SERIAL PRIMARY KEY,
  questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES admin_users(id),
  
  -- Job status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  current_step VARCHAR(255), -- e.g., "Generating plan structure", "Generating workouts"
  
  -- Results
  recommendation_id INTEGER REFERENCES recommendations(id),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for recommendation_jobs
CREATE INDEX IF NOT EXISTS idx_recommendation_jobs_status ON recommendation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_recommendation_jobs_questionnaire_id ON recommendation_jobs(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_jobs_client_id ON recommendation_jobs(client_id);

-- Trigger to auto-update updated_at for recommendation_jobs
DROP TRIGGER IF EXISTS update_recommendation_jobs_updated_at ON recommendation_jobs;
CREATE TRIGGER update_recommendation_jobs_updated_at BEFORE UPDATE ON recommendation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Actual Workouts (executed workout performance data)
CREATE TABLE IF NOT EXISTS actual_workouts (
  id SERIAL PRIMARY KEY,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  completed_by INTEGER REFERENCES admin_users(id),
  
  -- Actual performance data (stored as JSONB for flexibility)
  actual_performance JSONB NOT NULL,
  
  -- Session feedback
  session_notes TEXT,
  overall_rir INTEGER, -- Overall session RIR (Reps in Reserve, 0-5 scale)
  client_energy_level INTEGER, -- 1-10 scale
  trainer_observations TEXT,
  
  -- Timestamps
  started_at TIMESTAMP,
  completed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one actual workout per proposed workout
  UNIQUE(workout_id)
);

-- Indexes for actual_workouts
CREATE INDEX IF NOT EXISTS idx_actual_workouts_workout_id ON actual_workouts(workout_id);
CREATE INDEX IF NOT EXISTS idx_actual_workouts_completed_by ON actual_workouts(completed_by);
CREATE INDEX IF NOT EXISTS idx_actual_workouts_completed_at ON actual_workouts(completed_at);

-- Trigger to auto-update updated_at for actual_workouts
DROP TRIGGER IF EXISTS update_actual_workouts_updated_at ON actual_workouts;
CREATE TRIGGER update_actual_workouts_updated_at BEFORE UPDATE ON actual_workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Week Generation Jobs (for progressive week generation)
CREATE TABLE IF NOT EXISTS week_generation_jobs (
  id SERIAL PRIMARY KEY,
  recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  created_by INTEGER REFERENCES admin_users(id),
  
  -- Job status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  current_step VARCHAR(255),
  
  -- Results
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one job per week per recommendation
  UNIQUE(recommendation_id, week_number)
);

-- Indexes for week_generation_jobs
CREATE INDEX IF NOT EXISTS idx_week_generation_jobs_status ON week_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_week_generation_jobs_recommendation_id ON week_generation_jobs(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_week_generation_jobs_week_number ON week_generation_jobs(week_number);

-- Trigger to auto-update updated_at for week_generation_jobs
DROP TRIGGER IF EXISTS update_week_generation_jobs_updated_at ON week_generation_jobs;
CREATE TRIGGER update_week_generation_jobs_updated_at BEFORE UPDATE ON week_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

