-- Clinic medical certificate (galing sa clinic, inisyu ng doctor/nurse).
-- source: 'upload' (galing sa labas ng school) o 'clinic' (inisyu ng clinic). Default: upload.
-- Ligtas patakbuhin kahit ilang beses (IF NOT EXISTS).
-- Supabase: i-paste sa SQL Editor at i-Run.
-- Local:   npx prisma db execute --file prisma/sql/student-medical-certificates-clinic.sql --schema prisma/schema.prisma
ALTER TABLE student_medical_certificates ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'upload';