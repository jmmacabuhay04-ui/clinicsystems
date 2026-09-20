CREATE TABLE IF NOT EXISTS dental_health_forms (
  form_id     SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL UNIQUE REFERENCES students(student_id) ON DELETE CASCADE,
  level       VARCHAR(50),
  section     VARCHAR(50),
  age         INTEGER,
  sex         VARCHAR(10),
  chart       JSONB NOT NULL DEFAULT '{}'::jsonb,
  periodontal JSONB NOT NULL DEFAULT '{}'::jsonb,
  occlusion   JSONB NOT NULL DEFAULT '{}'::jsonb,
  treatment   JSONB NOT NULL DEFAULT '{}'::jsonb,
  remarks     TEXT,
  exam_date   DATE,
  examined_by VARCHAR(100),
  updated_by  VARCHAR(100),
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP(3)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);