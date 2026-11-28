-- Academic Head: category ng account (elementary, junior_high, senior_high, college).
-- Patakbuhin sa Supabase SQL Editor o: npx prisma db execute --file prisma/sql/academic-head.sql --schema prisma/schema.prisma
-- Safe i-run ulit (IF NOT EXISTS).
ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_category VARCHAR(20);