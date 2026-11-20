-- Oras ng dental visit (para sa Dental Record at sa edit page).
-- Ligtas patakbuhin kahit ilang beses (IF NOT EXISTS).
-- Supabase: i-paste sa SQL Editor at i-Run.
-- Local:   npx prisma db execute --file prisma/sql/dental-visit-time.sql --schema prisma/schema.prisma
ALTER TABLE dental_records ADD COLUMN IF NOT EXISTS visit_time TIME;
