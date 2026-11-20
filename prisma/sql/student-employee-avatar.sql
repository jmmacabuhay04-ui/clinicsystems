-- Larawan (profile photo) ng student at employee.
-- Ligtas patakbuhin kahit ilang beses (IF NOT EXISTS).
-- Supabase: i-paste sa SQL Editor at i-Run.
-- Local:   npx prisma db execute --file prisma/sql/student-employee-avatar.sql --schema prisma/schema.prisma
ALTER TABLE students  ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar TEXT;
