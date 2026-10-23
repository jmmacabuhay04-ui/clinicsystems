-- Oras ng clinic visit at symptoms/notes
ALTER TABLE "health_records" ADD COLUMN IF NOT EXISTS "visit_time" TIME;
ALTER TABLE "health_records" ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "employee_health_records" ADD COLUMN IF NOT EXISTS "visit_time" TIME;
ALTER TABLE "employee_health_records" ADD COLUMN IF NOT EXISTS "notes" TEXT;