-- ============================================================
-- CollabSphere — Migration 003: Project Management
-- ============================================================

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS projects (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    description  TEXT,
    status       project_status NOT NULL DEFAULT 'planning',
    priority     project_priority NOT NULL DEFAULT 'medium',
    start_date   DATE,
    deadline     DATE,
    created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
    -- Authoritative "is this archived" flag. Kept separate from `status`
    -- (which also has an 'archived' value) so archiving/restoring doesn't
    -- need to remember what the status was before archiving — see README
    -- for the full reasoning on why the spec's two archive signals are
    -- reconciled this way.
    archived     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects (workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects (archived);

CREATE TABLE IF NOT EXISTS project_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    added_by   UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members (project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members (user_id);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
