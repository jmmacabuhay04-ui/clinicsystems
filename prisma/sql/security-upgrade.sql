-- ============================================================
-- BCAS Clinic System - Security Upgrade
-- Patakbuhin:
--   npx prisma db execute --file prisma/sql/security-upgrade.sql --schema prisma/schema.prisma
-- Safe ito: puro CREATE IF NOT EXISTS at ADD COLUMN IF NOT EXISTS.
-- Walang tinatanggal na existing table o data.
-- ============================================================


-- ------------------------------------------------------------
-- 1) RECORD ACCESS LOGS
--    Sino ang tumingin / nag-edit / nag-print ng health record.
--    Ito ang accountability requirement ng RA 10173.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS record_access_logs (
    id          SERIAL PRIMARY KEY,
    actor_id    INTEGER,
    actor_role  TEXT,
    actor_name  TEXT,
    record_type TEXT NOT NULL,
    record_id   INTEGER,
    action      TEXT NOT NULL DEFAULT 'view',
    detail      TEXT,
    ip          TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_created
    ON record_access_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_actor
    ON record_access_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_record
    ON record_access_logs (record_type, record_id);


-- ------------------------------------------------------------
-- 2) LOGIN LOCKOUTS
--    Hiwalay sa login_logs para hindi mareset ang lock kapag
--    binura ang logs. May IP scope din, hindi lang username.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_lockouts (
    id           SERIAL PRIMARY KEY,
    scope        TEXT NOT NULL,
    lock_key     TEXT NOT NULL,
    fails        INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    first_fail   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lockout_key
    ON login_lockouts (scope, lock_key);


-- ------------------------------------------------------------
-- 3) MUST CHANGE PASSWORD
--    Kapag TRUE, pipilitin ang user na magpalit bago makapasok.
--    Dito nagagamot ang "alam ng nurse ang password ng student".
-- ------------------------------------------------------------
ALTER TABLE students  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users     ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Bawat existing account na ginawa ng nurse ay dapat magpalit.
-- I-comment out ang dalawang linyang ito kung ayaw mo pang ipilit sa lahat.
UPDATE students  SET must_change_password = TRUE WHERE must_change_password = FALSE;
UPDATE employees SET must_change_password = TRUE WHERE must_change_password = FALSE;


-- ------------------------------------------------------------
-- 4) IDENTITY VERIFICATIONS
--    Walk-in password reset: naitatala kung anong ID ang
--    ipinakita at sino ang nurse na nag-verify.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS identity_verifications (
    id               SERIAL PRIMARY KEY,
    subject_type     TEXT NOT NULL,
    subject_id       INTEGER NOT NULL,
    id_presented     TEXT NOT NULL,
    verified_by      INTEGER NOT NULL,
    verified_by_name TEXT,
    note             TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_subject
    ON identity_verifications (subject_type, subject_id);
