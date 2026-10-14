ALTER TYPE user_role
ADD VALUE IF NOT EXISTS 'MANAGER';
CREATE TABLE registration_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_registration_invites_created_by ON registration_invites(created_by);
 