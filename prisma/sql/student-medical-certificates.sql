-- Medical certificate ng estudyante (galing sa labas ng school).
-- Nurse ang nag-u-upload; PDF, JPG o PNG lang, max 5 MB.
-- Ligtas patakbuhin kahit ilang beses (IF NOT EXISTS).
-- Supabase: i-paste sa SQL Editor at i-Run.
-- Local:   npx prisma db execute --file prisma/sql/student-medical-certificates.sql --schema prisma/schema.prisma
CREATE TABLE IF NOT EXISTS student_medical_certificates (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  file_name   VARCHAR(255) NOT NULL,
  mime_type   VARCHAR(100) NOT NULL,
  file_size   INTEGER NOT NULL,
  file_data   BYTEA NOT NULL,
  uploaded_by INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_medical_certificates_student_idx
  ON student_medical_certificates (student_id, created_at DESC);