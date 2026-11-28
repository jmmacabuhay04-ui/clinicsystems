-- Archive ng medical certificate (hindi binubura; nare-restore pa).
-- Ligtas patakbuhin kahit ilang beses (IF NOT EXISTS).
-- Supabase: i-paste sa SQL Editor at i-Run.
-- Local:   npx prisma db execute --file prisma/sql/student-medical-certificates-archive.sql --schema prisma/schema.prisma
ALTER TABLE student_medical_certificates ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;