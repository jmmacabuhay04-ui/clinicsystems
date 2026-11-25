CREATE TABLE IF NOT EXISTS delete_account_requests (
    id              SERIAL PRIMARY KEY,
    target_user_id  INTEGER     NOT NULL,
    requested_by    INTEGER     NOT NULL,
    otp_hash        TEXT        NOT NULL,
    attempts        INTEGER     NOT NULL DEFAULT 0,
    expires_at      TIMESTAMP   NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delete_requests_requested_by
    ON delete_account_requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_delete_requests_target
    ON delete_account_requests (target_user_id, requested_by);