-- Action Taken para sa Health Case Reports.
-- Ligtas patakbuhin kahit ilang beses (IF NOT EXISTS).

ALTER TABLE health_case_reports
    ADD COLUMN IF NOT EXISTS action_taken VARCHAR(255);