-- Archive para sa Health Forms (Student, Employee, Dental, Health Declaration).
-- Patakbuhin sa Supabase SQL Editor (safe i-run ulit).
ALTER TABLE student_health_forms   ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP(3);
ALTER TABLE student_health_forms   ADD COLUMN IF NOT EXISTS archived_by INTEGER;
ALTER TABLE employee_health_forms  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP(3);
ALTER TABLE employee_health_forms  ADD COLUMN IF NOT EXISTS archived_by INTEGER;
ALTER TABLE dental_health_forms    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP(3);
ALTER TABLE dental_health_forms    ADD COLUMN IF NOT EXISTS archived_by INTEGER;
ALTER TABLE health_declarations    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP(3);
ALTER TABLE health_declarations    ADD COLUMN IF NOT EXISTS archived_by INTEGER;