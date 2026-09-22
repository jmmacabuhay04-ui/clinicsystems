CREATE TABLE IF NOT EXISTS portal_password_requests (
    request_id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    handled_by VARCHAR(100),
    handled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);