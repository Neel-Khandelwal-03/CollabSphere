-- ============================================================
-- CollabSphere — Migration 001: Users & Authentication
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(120) NOT NULL,
    email             VARCHAR(255) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    avatar_url        TEXT,
    bio               TEXT,
    designation       VARCHAR(120),
    skills            TEXT[],
    github_url        TEXT,
    linkedin_url      TEXT,
    portfolio_url     TEXT,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Refresh tokens are stored (hashed) so a token can be revoked server-side
-- (logout, logout-all-devices, password reset) rather than relying purely
-- on client-side deletion.
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash   VARCHAR(255) NOT NULL UNIQUE,
    user_agent   TEXT,
    ip_address   VARCHAR(64),
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);

-- Workspace-scoped role. Kept here (rather than a fixed enum on users)
-- because CollabSphere roles are per-workspace, not global — a user can be
-- an Admin in one workspace and a Viewer in another. This table is created
-- now so the auth middleware's role-check helper has something real to
-- query against; Module 3 (Workspace Management) will populate it.
DO $$ BEGIN
    CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(160) NOT NULL,
    description TEXT,
    logo_url    TEXT,
    owner_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role         workspace_role NOT NULL DEFAULT 'member',
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members (workspace_id);

-- Keep updated_at fresh automatically
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_workspaces_updated_at ON workspaces;
CREATE TRIGGER trg_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
