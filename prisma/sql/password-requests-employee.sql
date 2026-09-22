ALTER TABLE portal_password_requests ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE portal_password_requests
    ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(employee_id) ON DELETE CASCADE;
ALTER TABLE portal_password_requests DROP CONSTRAINT IF EXISTS portal_password_requests_owner_check;
ALTER TABLE portal_password_requests
    ADD CONSTRAINT portal_password_requests_owner_check CHECK ((student_id IS NULL) <> (employee_id IS NULL));