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

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_questionnaires_client_id ON questionnaires(client_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_client_id ON recommendations(client_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendation_edits_recommendation_id ON recommendation_edits(recommendation_id);

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

