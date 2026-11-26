-- BMI at BMI category para sa clinic visit (students) at employee visits.
-- Patakbuhin sa Supabase SQL Editor o: npx prisma db execute --file prisma/sql/bmi-columns.sql --schema prisma/schema.prisma
-- Safe i-run ulit (IF NOT EXISTS).
ALTER TABLE health_records          ADD COLUMN IF NOT EXISTS bmi NUMERIC(4,1);
ALTER TABLE health_records          ADD COLUMN IF NOT EXISTS bmi_category VARCHAR(20);
ALTER TABLE employee_health_records ADD COLUMN IF NOT EXISTS bmi NUMERIC(4,1);
ALTER TABLE employee_health_records ADD COLUMN IF NOT EXISTS bmi_category VARCHAR(20);