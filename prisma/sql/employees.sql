CREATE TABLE IF NOT EXISTS employees (
  employee_id     SERIAL PRIMARY KEY,
  employee_number VARCHAR(20) NOT NULL UNIQUE,
  last_name       VARCHAR(50) NOT NULL,
  first_name      VARCHAR(50) NOT NULL,
  middle_name     VARCHAR(50),
  department      VARCHAR(100),
  position        VARCHAR(100),
  date_of_birth   DATE,
  gender          VARCHAR(10),
  password        VARCHAR(255) NOT NULL,
  archived_at     TIMESTAMP(3),
  archived_by     VARCHAR(100),
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_health_records (
  record_id       SERIAL PRIMARY KEY,
  employee_id     INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  visit_date      DATE NOT NULL,
  complaint       VARCHAR(200) NOT NULL,
  action_taken    TEXT,
  attending_staff VARCHAR(100),
  height_cm       DOUBLE PRECISION,
  weight_kg       DOUBLE PRECISION,
  heart_rate      INTEGER,
  blood_pressure  VARCHAR(20),
  temperature     DOUBLE PRECISION,
  recorded_by     VARCHAR(100),
  archived_at     TIMESTAMP(3),
  archived_by     VARCHAR(100),
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emp_health_employee ON employee_health_records(employee_id);