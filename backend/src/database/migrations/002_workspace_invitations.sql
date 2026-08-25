-- ============================================================
-- CollabSphere — Migration 002: Workspace Invitations
-- ============================================================
-- workspaces and workspace_members already exist (see 001_init_auth.sql).
-- This migration adds the invite-by-email flow on top of them.

CREATE TABLE IF NOT EXISTS workspace_invitations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id      UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    email             VARCHAR(255) NOT NULL,
    role              workspace_role NOT NULL DEFAULT 'member',
    invited_by        UUID REFERENCES users (id) ON DELETE SET NULL,
    invitation_token  VARCHAR(255) NOT NULL UNIQUE,
    expires_at        TIMESTAMPTZ NOT NULL,
    -- NULL = pending, TRUE = accepted, FALSE = rejected
    accepted          BOOLEAN,
    responded_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT invitations_role_not_owner CHECK (role <> 'owner')
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id
    ON workspace_invitations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email
    ON workspace_invitations (email);

-- Only one *pending* invite per (workspace, email) at a time — re-inviting
-- someone updates their existing pending row instead of creating a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invitations_pending
    ON workspace_invitations (workspace_id, email)
    WHERE accepted IS NULL;
