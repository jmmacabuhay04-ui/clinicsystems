ALTER TABLE dental_records ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE dental_records
  ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(employee_id) ON DELETE CASCADE;

ALTER TABLE dental_records DROP CONSTRAINT IF EXISTS dental_records_patient_check;

ALTER TABLE dental_records
  ADD CONSTRAINT dental_records_patient_check
  CHECK ((student_id IS NULL) <> (employee_id IS NULL));