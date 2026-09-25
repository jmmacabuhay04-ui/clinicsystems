ALTER TABLE health_case_reports
    ADD COLUMN IF NOT EXISTS employee_id INTEGER;

ALTER TABLE health_case_reports
    ALTER COLUMN student_id DROP NOT NULL;